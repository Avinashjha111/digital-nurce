"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/provider";
import { extractPlaceholders } from "@/lib/whatsapp/templates";

export type SendTemplateState = { error: string | null; success?: boolean };

// Sends an approved template to a patient, starting a new conversation if
// one doesn't exist yet (unlike free-text replies, a template message can
// be the very first outbound message -- that's the whole point of
// templates: reaching a patient outside the 24h reply window).
//
// Agency-only: the agency manages template creation/approval already, and
// now sends them too, on behalf of any clinic it owns -- clinic staff keep
// read-only visibility in their inbox but no longer trigger sends
// themselves.
export async function sendTemplateMessage(
  patientId: string,
  templateId: string,
  _prevState: SendTemplateState,
  formData: FormData
): Promise<SendTemplateState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only the managing agency can send template messages." };
  }

  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, clinic_id, whatsapp_number")
    .eq("id", patientId)
    .single();
  if (!patient) {
    return { error: "Patient not found." };
  }

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("id, clinic_id, name, language, body_text, status, header_type, header_text")
    .eq("id", templateId)
    .single();
  if (!template) {
    return { error: "Template not found." };
  }
  if (template.status !== "approved") {
    return { error: "Only approved templates can be sent." };
  }
  if (
    template.header_type === "image" ||
    template.header_type === "video" ||
    template.header_type === "document" ||
    template.header_type === "location"
  ) {
    return {
      error:
        "Sending templates with an image, video, document, or location header isn't supported yet -- use a text-only or no-header template.",
    };
  }

  let headerParameter: string | undefined;
  if (template.header_type === "text" && template.header_text) {
    const headerPlaceholders = extractPlaceholders(template.header_text);
    if (headerPlaceholders.length > 0) {
      const value = String(formData.get("header_param") ?? "").trim();
      if (!value) {
        return { error: "Provide a value for the header variable." };
      }
      headerParameter = value;
    }
  }

  const placeholders = extractPlaceholders(template.body_text);
  const parameters: string[] = [];
  let renderedBody = template.body_text;
  for (const n of placeholders) {
    const value = String(formData.get(`param_${n}`) ?? "").trim();
    if (!value) {
      return { error: `Provide a value for {{${n}}}.` };
    }
    parameters.push(value);
    renderedBody = renderedBody.replace(`{{${n}}}`, value);
  }

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("phone_number_id, access_token")
    .eq("clinic_id", patient.clinic_id)
    .maybeSingle();
  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet." };
  }

  const result = await sendWhatsAppTemplateMessage({
    phoneNumberId: credential.phone_number_id,
    accessToken: credential.access_token,
    to: patient.whatsapp_number,
    templateName: template.name,
    languageCode: template.language,
    parameters,
    headerParameter,
  });

  // Template sends can start a brand-new conversation, so find-or-create
  // rather than assuming one exists (sendMessage, for replies, does not
  // need this -- an existing conversation is always the entry point there).
  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .maybeSingle();

  let conversationId = existingConversation?.id as string | undefined;

  if (!conversationId) {
    const { data: newConversation, error: convErr } = await supabase
      .from("conversations")
      .insert({ clinic_id: patient.clinic_id, patient_id: patientId })
      .select("id")
      .single();
    if (convErr || !newConversation) {
      return { error: convErr?.message ?? "Failed to start conversation." };
    }
    conversationId = newConversation.id;
  }

  const { error: insertErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    clinic_id: patient.clinic_id,
    patient_id: patientId,
    direction: "outbound",
    body: renderedBody,
    provider_message_id: result.ok ? result.providerMessageId : null,
    status: result.ok ? "sent" : "failed",
  });
  if (insertErr) {
    return { error: insertErr.message };
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/agency/patients/${patientId}`);
  revalidatePath("/agency/conversations");
  revalidatePath(`/clinic/inbox/${conversationId}`);
  revalidatePath("/clinic/inbox");

  if (!result.ok) {
    return { error: `Saved, but WhatsApp did not accept it: ${result.error}` };
  }

  return { error: null, success: true };
}
