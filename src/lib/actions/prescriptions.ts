"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

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
