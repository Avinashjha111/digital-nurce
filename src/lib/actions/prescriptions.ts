"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { aiService } from "@/lib/ai/aiService";

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
