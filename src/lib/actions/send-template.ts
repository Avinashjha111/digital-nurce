"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/provider";
import { extractPlaceholders } from "@/lib/whatsapp/templates";
import { deductMessageUnits, getClinicMessagingStatus, BLOCKED_REASON_MESSAGE } from "@/lib/billing";

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

  const billingStatus = await getClinicMessagingStatus(patient.clinic_id);
  if (!billingStatus.canSend) {
    return { error: BLOCKED_REASON_MESSAGE[billingStatus.reason] };
  }

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("id, clinic_id, twilio_content_sid, body_text, status, category")
    .eq("id", templateId)
    .single();
  if (!template) {
    return { error: "Template not found." };
  }
  if (template.status !== "approved") {
    return { error: "Only approved templates can be sent." };
  }
  if (!template.twilio_content_sid) {
    return { error: "This template has no Twilio content id -- recreate it." };
  }

  const placeholders = extractPlaceholders(template.body_text);
  const contentVariables: Record<string, string> = {};
  let renderedBody = template.body_text;
  for (const n of placeholders) {
    const value = String(formData.get(`param_${n}`) ?? "").trim();
    if (!value) {
      return { error: `Provide a value for {{${n}}}.` };
    }
    contentVariables[String(n)] = value;
    renderedBody = renderedBody.replace(`{{${n}}}`, value);
  }

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token, whatsapp_number_e164")
    .eq("clinic_id", patient.clinic_id)
    .maybeSingle();
  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet." };
  }

  const result = await sendWhatsAppTemplateMessage({
    subaccountSid: credential.twilio_subaccount_sid,
    subaccountAuthToken: credential.twilio_subaccount_auth_token,
    from: credential.whatsapp_number_e164,
    to: patient.whatsapp_number,
    contentSid: template.twilio_content_sid,
    contentVariables,
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
    source: "template",
    body: renderedBody,
    provider_message_id: result.ok ? result.providerMessageId : null,
    status: result.ok ? "sent" : "failed",
  });
  if (insertErr) {
    return { error: insertErr.message };
  }

  if (result.ok) {
    await deductMessageUnits(
      patient.clinic_id,
      template.category === "marketing" ? "marketing_template" : "standard"
    );
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
