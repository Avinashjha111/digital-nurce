import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

// Meta sends messages AND delivery/read statuses to this same URL (unlike
// Twilio's separate status-callback endpoint), so both are handled here.

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }>;
        statuses?: Array<{ id?: string; status?: string }>;
      };
    }>;
  }>;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_SECRET
  ) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true; // not configured in dev -- see .env.example note
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false; // length mismatch etc.
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // No user session exists for a webhook call, so this is a legitimate,
  // narrowly-scoped use of the service-role client.
  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const { data: credential } = await admin
        .from("whatsapp_credentials")
        .select("clinic_id")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (!credential) continue; // unknown phone number id -- ignore
      const clinicId = credential.clinic_id;

      for (const msg of value?.messages ?? []) {
        const from = normalizePhone(msg.from ?? "");
        if (!from) continue;

        const { data: existingPatient } = await admin
          .from("patients")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("whatsapp_number", from)
          .maybeSingle();

        let patientId = existingPatient?.id as string | undefined;

        if (!patientId) {
          const contactName = value?.contacts?.find(
            (c) => normalizePhone(c.wa_id ?? "") === from
          )?.profile?.name;

          const { data: newPatient, error: patientErr } = await admin
            .from("patients")
            .insert({
              clinic_id: clinicId,
              name: contactName || `WhatsApp ${from}`,
              whatsapp_number: from,
            })
            .select("id")
            .single();

          if (patientErr || !newPatient) continue;
          patientId = newPatient.id;
        }

        const { data: conversation } = await admin
          .from("conversations")
          .select("id, unread_count")
          .eq("patient_id", patientId)
          .maybeSingle();

        let conversationId = conversation?.id as string | undefined;

        if (conversationId) {
          await admin
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              unread_count: (conversation?.unread_count ?? 0) + 1,
            })
            .eq("id", conversationId);
        } else {
          const { data: newConversation, error: convErr } = await admin
            .from("conversations")
            .insert({ clinic_id: clinicId, patient_id: patientId, unread_count: 1 })
            .select("id")
            .single();

          if (convErr || !newConversation) continue;
          conversationId = newConversation.id;
        }

        const body =
          msg.text?.body ?? (msg.type ? `[${msg.type} message]` : "[unsupported message]");

        await admin.from("messages").insert({
          conversation_id: conversationId,
          clinic_id: clinicId,
          patient_id: patientId,
          direction: "inbound",
          body,
          provider_message_id: msg.id ?? null,
          status: "delivered",
        });

        // If this patient has a follow-up nudge awaiting a reply, this
        // inbound message counts as them responding -- Milestone 9's
        // "Contacted" status.
        await admin
          .from("follow_ups")
          .update({ status: "contacted" })
          .eq("patient_id", patientId)
          .eq("status", "due");
      }

      for (const status of value?.statuses ?? []) {
        if (!status.id || !status.status) continue;
        await admin.from("messages").update({ status: status.status }).eq("provider_message_id", status.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
