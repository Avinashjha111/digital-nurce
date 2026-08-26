"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/provider";
import { extractPlaceholders } from "@/lib/whatsapp/templates";
import { deductMessageUnits, getClinicMessagingStatus, BLOCKED_REASON_MESSAGE } from "@/lib/billing";

const MAX_BULK_RECIPIENTS = 200;

export type BulkSendResult = {
  error: string | null;
  sent: number;
  failed: { patientId: string; patientName: string; reason: string }[];
};

// Same send + find-or-create-conversation + log + meter flow as
// sendTemplateMessage (single patient), just looped sequentially so one
// clinic's rate limit / message balance is respected across many
// recipients -- mirrors the reminders/follow-ups cron loop pattern rather
// than firing everything in parallel. {{1}} can be auto-filled with each
// patient's own name; any other body variables are one shared value typed
// once and reused for every recipient in this batch.
export async function sendBulkTemplateMessages(
  clinicId: string,
  templateId: string,
  patientIds: string[],
  useNameForFirst: boolean,
  bodyValues: Record<number, string>
): Promise<BulkSendResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only the managing agency can send template messages.", sent: 0, failed: [] };
  }

  if (patientIds.length === 0) {
    return { error: "Select at least one patient.", sent: 0, failed: [] };
  }
  if (patientIds.length > MAX_BULK_RECIPIENTS) {
    return {
      error: `Bulk send is limited to ${MAX_BULK_RECIPIENTS} patients at a time.`,
      sent: 0,
      failed: [],
    };
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("id, clinic_id, twilio_content_sid, body_text, status, category")
    .eq("id", templateId)
    .eq("clinic_id", clinicId)
    .single();
  if (!template) {
    return { error: "Template not found.", sent: 0, failed: [] };
  }
  if (template.status !== "approved") {
    return { error: "Only approved templates can be sent.", sent: 0, failed: [] };
  }
  if (!template.twilio_content_sid) {
    return { error: "This template has no Twilio content id -- recreate it.", sent: 0, failed: [] };
  }

  const bodyPlaceholders = extractPlaceholders(template.body_text);
  for (const n of bodyPlaceholders) {
    if (n === 1 && useNameForFirst) continue;
    if (!bodyValues[n]?.trim()) {
      return { error: `Provide a value for {{${n}}}.`, sent: 0, failed: [] };
    }
  }

  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, whatsapp_number")
    .in("id", patientIds)
    .eq("clinic_id", clinicId);
  if (!patients || patients.length === 0) {
    return { error: "No matching patients found.", sent: 0, failed: [] };
  }

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_sid, twilio_subaccount_auth_token, whatsapp_number_e164")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet.", sent: 0, failed: [] };
  }

  let sent = 0;
  const failed: { patientId: string; patientName: string; reason: string }[] = [];

  for (const patient of patients) {
    // Re-checked per recipient (not once up front) -- a large batch can run
    // a clinic's balance to zero partway through, and the rest must stop
    // cleanly rather than send messages that were never metered.
    const billingStatus = await getClinicMessagingStatus(clinicId);
    if (!billingStatus.canSend) {
      failed.push({
        patientId: patient.id,
        patientName: patient.name,
        reason: BLOCKED_REASON_MESSAGE[billingStatus.reason],
      });
      continue;
    }

    const contentVariables: Record<string, string> = {};
    let renderedBody = template.body_text;
    for (const n of bodyPlaceholders) {
      const value = n === 1 && useNameForFirst ? patient.name : bodyValues[n];
      contentVariables[String(n)] = value;
      renderedBody = renderedBody.replace(`{{${n}}}`, value);
    }

    const result = await sendWhatsAppTemplateMessage({
      subaccountSid: credential.twilio_subaccount_sid,
      subaccountAuthToken: credential.twilio_subaccount_auth_token,
      from: credential.whatsapp_number_e164,
      to: patient.whatsapp_number,
      contentSid: template.twilio_content_sid,
      contentVariables,
    });

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("patient_id", patient.id)
      .maybeSingle();

    let conversationId = existingConversation?.id as string | undefined;
    if (!conversationId) {
      const { data: newConversation } = await supabase
        .from("conversations")
        .insert({ clinic_id: clinicId, patient_id: patient.id })
        .select("id")
        .single();
      conversationId = newConversation?.id;
    }

    if (conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        clinic_id: clinicId,
        patient_id: patient.id,
        direction: "outbound",
        source: "template",
        body: renderedBody,
        provider_message_id: result.ok ? result.providerMessageId : null,
        status: result.ok ? "sent" : "failed",
      });
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    if (result.ok) {
      sent++;
      await deductMessageUnits(
        clinicId,
        template.category === "marketing" ? "marketing_template" : "standard"
      );
    } else {
      failed.push({ patientId: patient.id, patientName: patient.name, reason: result.error });
    }
  }

  revalidatePath(`/agency/clinics/${clinicId}`);
  revalidatePath("/agency/conversations");
  revalidatePath("/agency/usage");
  revalidatePath(`/agency/clinics/${clinicId}/messages`);

  return { error: null, sent, failed };
}
