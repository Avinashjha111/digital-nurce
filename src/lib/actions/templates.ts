"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  createWhatsAppTemplate,
  extractPlaceholders,
  fetchTemplateStatus,
  submitTemplateForApproval,
  type TemplateButtonInput,
} from "@/lib/whatsapp/templates";

export type CreateTemplateState = { error: string | null; success?: boolean };

const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required")
    .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscores"),
  category: z.enum(["utility", "marketing", "authentication"]),
  language: z.string().trim().min(1, "Language is required"),
  body_text: z.string().trim().min(1, "Template body is required"),
  header_type: z.enum(["none", "text", "image", "video", "document", "location"]),
  header_text: z.string().trim().optional(),
  footer_text: z.string().trim().optional(),
});

const buttonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("QUICK_REPLY"), text: z.string().trim().min(1).max(25) }),
  z.object({ type: z.literal("URL"), text: z.string().trim().min(1).max(25), url: z.string().trim().url() }),
  z.object({
    type: z.literal("PHONE_NUMBER"),
    text: z.string().trim().min(1).max(25),
    phoneNumber: z.string().trim().min(1),
  }),
]);

export async function createTemplate(
  clinicId: string,
  _prevState: CreateTemplateState,
  formData: FormData
): Promise<CreateTemplateState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only agency admins can create templates." };
  }

  const placeholderCount = extractPlaceholders(String(formData.get("body_text") ?? "")).length;
  const examples: string[] = [];
  for (let i = 1; i <= placeholderCount; i++) {
    const value = String(formData.get(`example_${i}`) ?? "").trim();
    if (!value) {
      return { error: `Provide an example value for {{${i}}}.` };
    }
    examples.push(value);
  }

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    language: formData.get("language"),
    body_text: formData.get("body_text"),
    header_type: formData.get("header_type") || "none",
    header_text: formData.get("header_text") || undefined,
    footer_text: formData.get("footer_text") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Twilio's Content API field shapes for these aren't confirmed anywhere
  // reachable -- rather than guess and risk a malformed template, they're
  // blocked here with a clear message. Nothing the app sends automatically
  // (reminders/follow-ups/bulk-send) needs any of these.
  if (parsed.data.header_type === "image" || parsed.data.header_type === "video" || parsed.data.header_type === "document") {
    return { error: "Media headers aren't supported yet -- use a text-only or no-header template." };
  }
  if (parsed.data.header_type === "location") {
    return { error: "Location headers aren't supported yet." };
  }
  if (parsed.data.footer_text) {
    return { error: "Footer text isn't supported yet -- leave it blank." };
  }

  let buttons: TemplateButtonInput[] = [];
  const buttonsRaw = String(formData.get("buttons_json") ?? "[]");
  try {
    const parsedButtons = JSON.parse(buttonsRaw);
    const validated = z.array(buttonSchema).safeParse(parsedButtons);
    if (!validated.success) {
      return { error: "One of the buttons is missing required fields, or uses an unsupported type (copy-code buttons aren't supported yet)." };
    }
    buttons = validated.data;
  } catch {
    return { error: "Invalid button data." };
  }

  const supabase = await createClient();

  // Ownership check via the caller's own RLS-bound session.
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .single();

  if (!clinic) {
    return { error: "Clinic not found or you do not own it." };
  }

  // Credentials are only readable via the service-role client -- same
  // reasoning as sendMessage/processPrescription.
  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet." };
  }

  if (parsed.data.header_type === "text" && parsed.data.header_text) {
    return {
      error:
        "Text headers aren't supported yet on Twilio -- put everything in the body text for now.",
    };
  }

  const createResult = await createWhatsAppTemplate({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    name: parsed.data.name,
    language: parsed.data.language,
    bodyText: parsed.data.body_text,
    examples,
    buttons,
  });

  if (!createResult.ok) {
    return { error: `Twilio rejected the template: ${createResult.error}` };
  }

  const approvalResult = await submitTemplateForApproval({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    contentSid: createResult.contentSid,
    name: parsed.data.name,
    category: parsed.data.category.toUpperCase() as "UTILITY" | "MARKETING" | "AUTHENTICATION",
  });

  if (!approvalResult.ok) {
    return { error: `Could not submit for WhatsApp approval: ${approvalResult.error}` };
  }

  const { error: insertError } = await supabase.from("whatsapp_templates").insert({
    clinic_id: clinicId,
    name: parsed.data.name,
    category: parsed.data.category,
    language: parsed.data.language,
    body_text: parsed.data.body_text,
    header_type: "none",
    header_text: null,
    header_media_path: null,
    footer_text: null,
    buttons,
    twilio_content_sid: createResult.contentSid,
    status: approvalResult.status,
    created_by: profile.id,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/agency/clinics/${clinicId}/templates`);
  return { error: null, success: true };
}

export async function refreshTemplateStatus(templateId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") return;

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("id, clinic_id, twilio_content_sid")
    .eq("id", templateId)
    .single();

  if (!template?.twilio_content_sid) return;

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token")
    .eq("clinic_id", template.clinic_id)
    .maybeSingle();

  if (!credential) return;

  const result = await fetchTemplateStatus({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    contentSid: template.twilio_content_sid,
  });

  if (!result.ok) return;

  await supabase
    .from("whatsapp_templates")
    .update({ status: result.status, rejection_reason: result.rejectionReason })
    .eq("id", templateId);

  revalidatePath(`/agency/clinics/${template.clinic_id}/templates`);
}
