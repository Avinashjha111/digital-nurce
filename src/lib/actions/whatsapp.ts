"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { verifyWhatsAppCredentials } from "@/lib/whatsapp/provider";

export type ConnectWhatsAppState = { error: string | null; success?: boolean };

const connectSchema = z.object({
  phone_number_id: z.string().trim().min(1, "Phone Number ID is required"),
  access_token: z.string().trim().min(1, "Access token is required"),
  waba_id: z.string().trim().min(1, "WhatsApp Business Account ID is required"),
  meta_app_id: z.string().trim().optional(),
});

export async function connectWhatsApp(
  clinicId: string,
  _prevState: ConnectWhatsAppState,
  formData: FormData
): Promise<ConnectWhatsAppState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can connect WhatsApp." };
  }

  const parsed = connectSchema.safeParse({
    phone_number_id: formData.get("phone_number_id"),
    access_token: formData.get("access_token"),
    waba_id: formData.get("waba_id"),
    meta_app_id: formData.get("meta_app_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // Ownership is enforced through the caller's own RLS-bound session: this
  // returns nothing if the clinic doesn't exist or isn't theirs.
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .single();

  if (!clinic) {
    return { error: "Clinic not found or you do not own it." };
  }

  const verification = await verifyWhatsAppCredentials({
    phoneNumberId: parsed.data.phone_number_id,
    accessToken: parsed.data.access_token,
  });

  if (!verification.ok) {
    return { error: `Could not verify with WhatsApp: ${verification.error}` };
  }

  // Secrets go through the admin client only -- the caller's own session has
  // (and should have) no RLS policy that would let this table be touched.
  const admin = createAdminClient();
  const { error: credError } = await admin.from("whatsapp_credentials").upsert({
    clinic_id: clinicId,
    phone_number_id: parsed.data.phone_number_id,
    access_token: parsed.data.access_token,
    waba_id: parsed.data.waba_id,
    meta_app_id: parsed.data.meta_app_id || null,
    updated_at: new Date().toISOString(),
  });

  if (credError) {
    return { error: `Failed to store credentials: ${credError.message}` };
  }

  const { error: updateError } = await supabase
    .from("clinics")
    .update({
      whatsapp_status: "connected",
      whatsapp_number: verification.displayNumber,
      whatsapp_last_checked_at: new Date().toISOString(),
    })
    .eq("id", clinicId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null, success: true };
}

export type SetReminderTemplateResult = { error: string | null };

// Milestone 8: which approved template the scheduler sends reminders
// with. Reminders always go out as a template (they're business-initiated
// on a schedule, not a reply, so they're outside WhatsApp's 24h free-text
// window) -- the agency picks which one, same ownership as everything
// else template-related.
export async function setReminderTemplate(
  clinicId: string,
  templateId: string | null
): Promise<SetReminderTemplateResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can set the reminder template." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clinics")
    .update({ reminder_template_id: templateId })
    .eq("id", clinicId);

  if (error) return { error: error.message };

  revalidatePath(`/agency/clinics/${clinicId}`);
  return { error: null };
}
