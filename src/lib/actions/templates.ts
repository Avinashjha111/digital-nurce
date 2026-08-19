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
  uploadTemplateHeaderMedia,
  type TemplateButtonInput,
  type TemplateHeaderInput,
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
  header_media_path: z.string().trim().optional(),
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
  z.object({ type: z.literal("COPY_CODE"), example: z.string().trim().min(1) }),
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
    header_media_path: formData.get("header_media_path") || undefined,
    footer_text: formData.get("footer_text") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let buttons: TemplateButtonInput[] = [];
  const buttonsRaw = String(formData.get("buttons_json") ?? "[]");
  try {
    const parsedButtons = JSON.parse(buttonsRaw);
    const validated = z.array(buttonSchema).safeParse(parsedButtons);
    if (!validated.success) {
      return { error: "One of the buttons is missing required fields." };
    }
    buttons = validated.data;
  } catch {
    return { error: "Invalid button data." };
  }

  if (
    (parsed.data.header_type === "image" ||
      parsed.data.header_type === "video" ||
      parsed.data.header_type === "document") &&
    !parsed.data.header_media_path
  ) {
    return { error: "Upload a sample file for the media header first." };
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

  // Credentials (including waba_id/meta_app_id) are only readable via the
  // service-role client -- same reasoning as sendMessage/processPrescription.
  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("waba_id, access_token, meta_app_id")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet." };
  }
  if (!credential.waba_id) {
    return {
      error:
        "This clinic's WhatsApp connection is missing a WhatsApp Business Account ID. Reconnect WhatsApp with it filled in first.",
    };
  }

  let header: TemplateHeaderInput = { type: "none" };

  if (parsed.data.header_type === "text" && parsed.data.header_text) {
    const headerPlaceholders = extractPlaceholders(parsed.data.header_text);
    const headerExample =
      headerPlaceholders.length > 0
        ? String(formData.get("header_example") ?? "").trim()
        : undefined;
    if (headerPlaceholders.length > 0 && !headerExample) {
      return { error: "Provide an example value for the header variable." };
    }
    header = { type: "text", text: parsed.data.header_text, example: headerExample };
  } else if (
    (parsed.data.header_type === "image" ||
      parsed.data.header_type === "video" ||
      parsed.data.header_type === "document") &&
    parsed.data.header_media_path
  ) {
    if (!credential.meta_app_id) {
      return {
        error:
          "Media headers need a Meta App ID saved on this clinic's WhatsApp connection. Reconnect WhatsApp with it filled in first.",
      };
    }

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("template-media")
      .download(parsed.data.header_media_path);

    if (downloadError || !fileBlob) {
      return { error: downloadError?.message ?? "Could not read the uploaded header media." };
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const uploadResult = await uploadTemplateHeaderMedia({
      appId: credential.meta_app_id,
      accessToken: credential.access_token,
      fileBytes: new Uint8Array(arrayBuffer),
      mimeType: fileBlob.type || "application/octet-stream",
    });

    if (!uploadResult.ok) {
      return { error: `Could not upload header media to Meta: ${uploadResult.error}` };
    }

    header = { type: parsed.data.header_type, handle: uploadResult.handle };
  } else if (parsed.data.header_type === "location") {
    header = { type: "location" };
  }

  const result = await createWhatsAppTemplate({
    wabaId: credential.waba_id,
    accessToken: credential.access_token,
    name: parsed.data.name,
    category: parsed.data.category.toUpperCase() as "UTILITY" | "MARKETING" | "AUTHENTICATION",
    language: parsed.data.language,
    bodyText: parsed.data.body_text,
    examples,
    header,
    footerText: parsed.data.footer_text || null,
    buttons,
  });

  if (!result.ok) {
    return { error: `Meta rejected the template: ${result.error}` };
  }

  const { error: insertError } = await supabase.from("whatsapp_templates").insert({
    clinic_id: clinicId,
    name: parsed.data.name,
    category: parsed.data.category,
    language: parsed.data.language,
    body_text: parsed.data.body_text,
    header_type: parsed.data.header_type,
    header_text: parsed.data.header_text || null,
    header_media_path: parsed.data.header_media_path || null,
    footer_text: parsed.data.footer_text || null,
    buttons,
    meta_template_id: result.metaTemplateId,
    status: result.status,
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
    .select("id, clinic_id, meta_template_id")
    .eq("id", templateId)
    .single();

  if (!template?.meta_template_id) return;

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("access_token")
    .eq("clinic_id", template.clinic_id)
    .maybeSingle();

  if (!credential) return;

  const result = await fetchTemplateStatus({
    metaTemplateId: template.meta_template_id,
    accessToken: credential.access_token,
  });

  if (!result.ok) return;

  await supabase
    .from("whatsapp_templates")
    .update({ status: result.status, rejection_reason: result.rejectionReason })
    .eq("id", templateId);

  revalidatePath(`/agency/clinics/${template.clinic_id}/templates`);
}
