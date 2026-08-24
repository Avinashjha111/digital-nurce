"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { normalizePhone } from "@/lib/phone";

export type CreatePatientState = { error: string | null };

const patientSchema = z.object({
  name: z.string().trim().min(1, "Patient name is required"),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, "WhatsApp number is required")
    .transform(normalizePhone)
    .refine((v) => v.length >= 10, "Enter a valid WhatsApp number with country code"),
});

export async function createPatient(
  _prevState: CreatePatientState,
  formData: FormData
): Promise<CreatePatientState> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff assigned to a clinic can add patients." };
  }

  const parsed = patientSchema.safeParse({
    name: formData.get("name"),
    whatsapp_number: formData.get("whatsapp_number"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      name: parsed.data.name,
      whatsapp_number: parsed.data.whatsapp_number,
    })
    .select("id")
    .single();

  if (error || !patient) {
    return { error: error?.message ?? "Failed to add patient." };
  }

  revalidatePath("/clinic/patients");
  redirect(`/clinic/patients/${patient.id}`);
}

export type BulkCreatePatientsResult = {
  error: string | null;
  inserted: number;
  skipped: { row: number; reason: string }[];
};

const bulkRowSchema = z.object({
  row: z.number(),
  name: z.string().trim().min(1, "Missing name"),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, "Missing WhatsApp number")
    .transform(normalizePhone)
    .refine((v) => v.length >= 10, "Invalid WhatsApp number"),
});

const MAX_BULK_ROWS = 500;

export async function bulkCreatePatients(
  rows: { row: number; name: string; whatsapp_number: string }[]
): Promise<BulkCreatePatientsResult> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return {
      error: "Only clinic staff assigned to a clinic can add patients.",
      inserted: 0,
      skipped: [],
    };
  }

  if (rows.length === 0) {
    return { error: "No rows to import.", inserted: 0, skipped: [] };
  }
  if (rows.length > MAX_BULK_ROWS) {
    return {
      error: `Import is limited to ${MAX_BULK_ROWS} patients at a time.`,
      inserted: 0,
      skipped: [],
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("patients")
    .select("whatsapp_number")
    .eq("clinic_id", profile.clinic_id);
  const seenNumbers = new Set((existing ?? []).map((p) => p.whatsapp_number));

  const toInsert: { clinic_id: string; name: string; whatsapp_number: string }[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (const row of rows) {
    const parsed = bulkRowSchema.safeParse(row);
    if (!parsed.success) {
      skipped.push({ row: row.row, reason: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    if (seenNumbers.has(parsed.data.whatsapp_number)) {
      skipped.push({ row: row.row, reason: "Already exists" });
      continue;
    }
    seenNumbers.add(parsed.data.whatsapp_number);
    toInsert.push({
      clinic_id: profile.clinic_id,
      name: parsed.data.name,
      whatsapp_number: parsed.data.whatsapp_number,
    });
  }

  if (toInsert.length === 0) {
    return { error: "No valid new patients to import.", inserted: 0, skipped };
  }

  const { error, count } = await supabase
    .from("patients")
    .insert(toInsert, { count: "exact" });

  if (error) {
    return { error: error.message, inserted: 0, skipped };
  }

  revalidatePath("/clinic/patients");
  revalidatePath("/clinic/dashboard");

  return { error: null, inserted: count ?? toInsert.length, skipped };
}

export type DeletePatientResult = { error: string | null };

// Agency-only, permanent. Every table referencing patients (conversations,
// messages, prescriptions, prescription_medicines, reminders, follow_ups,
// appointment_requests) already cascades on delete, so removing the
// patients row is enough to erase all of it -- storage files are cleaned
// up separately first since Storage isn't covered by SQL cascades.
export async function deletePatient(patientId: string): Promise<DeletePatientResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only the managing agency can delete a patient." };
  }

  const supabase = await createClient();

  // RLS-bound: only returns a row if this patient belongs to a clinic the
  // caller's agency owns.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, clinic_id")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return { error: "Patient not found." };
  }

  // Best-effort: prescription files live at {clinic_id}/{patient_id}/...
  // in the private "prescriptions" bucket. A failure here shouldn't block
  // removing the patient's data from every dashboard, so it's not fatal.
  const folder = `${patient.clinic_id}/${patient.id}`;
  const { data: files } = await supabase.storage.from("prescriptions").list(folder);
  if (files && files.length > 0) {
    await supabase.storage
      .from("prescriptions")
      .remove(files.map((f) => `${folder}/${f.name}`));
  }

  const { error } = await supabase.from("patients").delete().eq("id", patientId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agency/patients");
  revalidatePath("/agency/dashboard");
  revalidatePath("/agency/prescriptions");
  revalidatePath("/agency/reminders");
  revalidatePath("/agency/follow-ups");
  revalidatePath("/agency/conversations");
  revalidatePath("/clinic/patients");
  revalidatePath("/clinic/dashboard");
  revalidatePath("/clinic/prescriptions");
  revalidatePath("/clinic/reminders");
  revalidatePath("/clinic/follow-ups");
  revalidatePath("/clinic/inbox");

  return { error: null };
}
