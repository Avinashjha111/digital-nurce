"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export type CreateClinicState = { error: string | null };

const clinicSchema = z.object({
  name: z.string().trim().min(1, "Clinic name is required"),
  doctor_name: z.string().trim().min(1, "Doctor name is required"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  whatsapp_number: z.string().trim().optional(),
});

export async function createClinic(
  _prevState: CreateClinicState,
  formData: FormData
): Promise<CreateClinicState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can add clinics." };
  }

  const parsed = clinicSchema.safeParse({
    name: formData.get("name"),
    doctor_name: formData.get("doctor_name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    city: formData.get("city"),
    whatsapp_number: formData.get("whatsapp_number"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, doctor_name, phone, address, city, whatsapp_number } =
    parsed.data;

  const supabase = await createClient();

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .insert({
      name,
      phone: phone || null,
      address: address || null,
      city: city || null,
      whatsapp_number: whatsapp_number || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    return { error: clinicError?.message ?? "Failed to create clinic." };
  }

  const { error: doctorError } = await supabase
    .from("doctors")
    .insert({ clinic_id: clinic.id, name: doctor_name });

  if (doctorError) {
    return { error: doctorError.message };
  }

  revalidatePath("/agency/clinics");
  redirect(`/agency/clinics/${clinic.id}`);
}
