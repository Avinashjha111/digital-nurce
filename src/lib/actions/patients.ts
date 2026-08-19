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
