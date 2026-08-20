"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { aiService } from "@/lib/ai/aiService";
import { buildReminderSchedule } from "@/lib/reminders/schedule";

const schema = z.object({
  patient_id: z.string().uuid("Select a patient"),
  doctor_id: z.string().uuid("Select a doctor"),
  file_path: z.string().min(1),
  file_type: z.string().min(1),
});

export type CreatePrescriptionInput = z.infer<typeof schema>;
export type CreatePrescriptionResult = { error: string | null; id?: string };

// Called from the client after the file itself has already been uploaded
// directly to Supabase Storage (RLS-bound to the caller's own session) --
// this just records the metadata row.
export async function createPrescriptionRecord(
  input: CreatePrescriptionInput
): Promise<CreatePrescriptionResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can upload prescriptions." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      clinic_id: profile.clinic_id,
      patient_id: parsed.data.patient_id,
      doctor_id: parsed.data.doctor_id,
      file_path: parsed.data.file_path,
      file_type: parsed.data.file_type,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to save prescription record." };
  }

  revalidatePath("/clinic/prescriptions");
  return { error: null, id: data.id };
}

export type ProcessPrescriptionResult = { error: string | null };

// Downloads the uploaded file and runs it through aiService.extractPrescription()
// (Gemini today). Runs entirely under the caller's own session -- Gemini is
// an external API call, not a Supabase privilege escalation, so the
// service-role client is never needed here. Also used by the "Retry
// extraction" action on a failed prescription.
export async function processPrescription(
  prescriptionId: string
): Promise<ProcessPrescriptionResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can process prescriptions." };
  }

  const supabase = await createClient();

  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, clinic_id, file_path, file_type")
    .eq("id", prescriptionId)
    .single();

  if (!prescription) {
    return { error: "Prescription not found." };
  }

  await supabase
    .from("prescriptions")
    .update({ status: "processing", extraction_error: null })
    .eq("id", prescriptionId);

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("prescriptions")
    .download(prescription.file_path);

  if (downloadError || !fileBlob) {
    const message = downloadError?.message ?? "Could not download the uploaded file.";
    await supabase
      .from("prescriptions")
      .update({ status: "failed", extraction_error: message })
      .eq("id", prescriptionId);
    revalidatePath(`/clinic/prescriptions/${prescriptionId}`);
    return { error: message };
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const result = await aiService.extractPrescription(
    new Uint8Array(arrayBuffer),
    prescription.file_type
  );

  if (!result.ok) {
    await supabase
      .from("prescriptions")
      .update({ status: "failed", extraction_error: result.error })
      .eq("id", prescriptionId);
    revalidatePath(`/clinic/prescriptions/${prescriptionId}`);
    return { error: result.error };
  }

  const { data: extracted } = result;

  // Clear any previous medicines first -- matters on reprocess.
  await supabase.from("prescription_medicines").delete().eq("prescription_id", prescriptionId);

  if (extracted.medicines.length > 0) {
    const { error: medError } = await supabase.from("prescription_medicines").insert(
      extracted.medicines.map((m) => ({
        prescription_id: prescriptionId,
        clinic_id: prescription.clinic_id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration_days: m.duration_days,
        timings: m.timings,
        instruction: m.instruction,
        needs_review: m.needs_review,
      }))
    );

    if (medError) {
      await supabase
        .from("prescriptions")
        .update({ status: "failed", extraction_error: medError.message })
        .eq("id", prescriptionId);
      revalidatePath(`/clinic/prescriptions/${prescriptionId}`);
      return { error: medError.message };
    }
  }

  await supabase
    .from("prescriptions")
    .update({
      status: "review_required",
      extracted_patient_name: extracted.patient_name,
      patient_name_needs_review: extracted.patient_name_needs_review,
      follow_up_required: extracted.follow_up.required,
      follow_up_days_after: extracted.follow_up.days_after,
      follow_up_instruction: extracted.follow_up.instruction,
      follow_up_needs_review: extracted.follow_up.needs_review,
    })
    .eq("id", prescriptionId);

  revalidatePath(`/clinic/prescriptions/${prescriptionId}`);
  revalidatePath("/clinic/prescriptions");
  return { error: null };
}

const reviewMedicineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Every medicine needs a name."),
  dosage: z.string().trim().optional().default(""),
  frequency: z.string().trim().optional().default(""),
  durationDays: z.number().int().positive().nullable(),
  timings: z.string().trim().optional().default(""),
  instruction: z.string().trim().optional().default(""),
});

const reviewSchema = z.object({
  prescriptionId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  patientName: z.string().trim(),
  followUpRequired: z.boolean(),
  followUpDaysAfter: z.number().int().positive().nullable(),
  followUpInstruction: z.string().trim().optional().default(""),
  medicines: z.array(reviewMedicineSchema),
  removedMedicineIds: z.array(z.string().uuid()),
});

export type SubmitPrescriptionReviewInput = z.infer<typeof reviewSchema>;
export type SubmitPrescriptionReviewResult = { error: string | null };

// Milestone 7: human approve/edit/reject. This is the only path that can
// move a prescription past 'review_required' -- reminders (Milestone 8) may
// only be created from prescriptions with status 'approved'. Edits made
// here (patient name, follow-up, medicines) overwrite the raw AI output and
// clear every needs_review flag, since a human has now confirmed the value.
export async function submitPrescriptionReview(
  input: SubmitPrescriptionReviewInput
): Promise<SubmitPrescriptionReviewResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can review prescriptions." };
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  if (data.decision === "approved") {
    if (!data.patientName) {
      return { error: "Patient name is required to approve." };
    }
    if (data.medicines.length === 0) {
      return { error: "At least one medicine is required to approve." };
    }
  }

  const supabase = await createClient();

  // RLS-bound: only returns a row if this prescription belongs to the
  // caller's own clinic.
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, clinic_id, patient_id, status")
    .eq("id", data.prescriptionId)
    .single();

  if (!prescription) {
    return { error: "Prescription not found." };
  }
  if (prescription.status !== "review_required") {
    return { error: "This prescription is not awaiting review." };
  }

  if (data.removedMedicineIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from("prescription_medicines")
      .delete()
      .eq("prescription_id", data.prescriptionId)
      .in("id", data.removedMedicineIds);
    if (deleteErr) return { error: deleteErr.message };
  }

  const savedMedicines: {
    id: string;
    name: string;
    dosage: string | null;
    instruction: string | null;
    timings: string[] | null;
    durationDays: number | null;
  }[] = [];

  for (const medicine of data.medicines) {
    const timings = medicine.timings
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: medicine.name,
      dosage: medicine.dosage || null,
      frequency: medicine.frequency || null,
      duration_days: medicine.durationDays,
      timings: timings.length > 0 ? timings : null,
      instruction: medicine.instruction || null,
      needs_review: false,
    };

    let medicineId = medicine.id;

    if (medicineId) {
      const { error: updateErr } = await supabase
        .from("prescription_medicines")
        .update(payload)
        .eq("id", medicineId)
        .eq("prescription_id", data.prescriptionId);
      if (updateErr) return { error: updateErr.message };
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("prescription_medicines")
        .insert({
          ...payload,
          prescription_id: data.prescriptionId,
          clinic_id: prescription.clinic_id,
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        return { error: insertErr?.message ?? "Failed to save medicine." };
      }
      medicineId = inserted.id;
    }

    savedMedicines.push({
      id: medicineId!,
      name: payload.name,
      dosage: payload.dosage,
      instruction: payload.instruction,
      timings: payload.timings,
      durationDays: payload.duration_days,
    });
  }

  const { error: updateErr } = await supabase
    .from("prescriptions")
    .update({
      status: data.decision,
      extracted_patient_name: data.patientName || null,
      patient_name_needs_review: false,
      follow_up_required: data.followUpRequired,
      follow_up_days_after: data.followUpDaysAfter,
      follow_up_instruction: data.followUpInstruction || null,
      follow_up_needs_review: false,
    })
    .eq("id", data.prescriptionId);

  if (updateErr) return { error: updateErr.message };

  if (data.decision === "approved") {
    const now = new Date();
    const reminderRows = savedMedicines.flatMap((medicine) =>
      buildReminderSchedule(medicine.timings, medicine.durationDays, now).map(
        (scheduledAt) => ({
          clinic_id: prescription.clinic_id,
          patient_id: prescription.patient_id,
          prescription_id: data.prescriptionId,
          medicine_id: medicine.id,
          scheduled_at: scheduledAt.toISOString(),
        })
      )
    );

    if (reminderRows.length > 0) {
      const { error: reminderErr } = await supabase.from("reminders").insert(reminderRows);
      if (reminderErr) return { error: reminderErr.message };
    }
  }

  revalidatePath(`/clinic/prescriptions/${data.prescriptionId}`);
  revalidatePath("/clinic/prescriptions");
  revalidatePath("/clinic/reminders");
  revalidatePath("/agency/reminders");
  return { error: null };
}
