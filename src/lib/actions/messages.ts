"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { sendWhatsAppMessage } from "@/lib/whatsapp/provider";

export type SendMessageState = { error: string | null };

const sendSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty"),
});

export async function sendMessage(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist") ||
    !profile.clinic_id
  ) {
    return { error: "Only clinic staff can send messages." };
  }

  const parsed = sendSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // RLS-bound: only returns a row if this conversation belongs to the
  // caller's own clinic.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, clinic_id, patient_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return { error: "Conversation not found." };
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("whatsapp_number")
    .eq("id", conversation.patient_id)
    .single();

  if (!patient) {
    return { error: "Patient not found." };
  }

  // Credentials live in a table with zero RLS policies -- only the
  // service-role client (server-only, right here) can read them.
  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("phone_number_id, access_token")
    .eq("clinic_id", conversation.clinic_id)
    .maybeSingle();

  if (!credential) {
    return { error: "This clinic has not connected WhatsApp yet." };
  }

  const result = await sendWhatsAppMessage({
    phoneNumberId: credential.phone_number_id,
    accessToken: credential.access_token,
    to: patient.whatsapp_number,
    body: parsed.data.body,
  });

  const { error: insertErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    clinic_id: conversation.clinic_id,
    patient_id: conversation.patient_id,
    direction: "outbound",
    body: parsed.data.body,
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

  revalidatePath(`/clinic/inbox/${conversationId}`);
  revalidatePath("/clinic/inbox");

  if (!result.ok) {
    return { error: `Saved, but WhatsApp did not accept it: ${result.error}` };
  }

  return { error: null };
}

export async function markConversationRead(conversationId: string) {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist")
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  revalidatePath("/clinic/inbox");
}

export async function toggleHumanAttention(conversationId: string, next: boolean) {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    (profile.role !== "clinic_admin" && profile.role !== "receptionist")
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ human_attention: next })
    .eq("id", conversationId);

  revalidatePath(`/clinic/inbox/${conversationId}`);
  revalidatePath("/clinic/inbox");
}
