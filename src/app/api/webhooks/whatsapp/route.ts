import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { sendPushToClinic } from "@/lib/push";
import { deductMessageUnits } from "@/lib/billing";

const MEDIA_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function classifyMediaType(mimeType: string): "image" | "document" | "video" | "audio" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType) return "document";
  return null;
}

// Twilio's inbound-message webhook: form-encoded (From/To/Body/MessageSid/
// NumMedia/MediaUrl0../ProfileName), one webhook per message -- unlike
// Meta's batched JSON entries. Delivery/read status updates arrive at a
// SEPARATE callback URL (see ../status/route.ts), not here.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const paramsObject = Object.fromEntries(params.entries());

  const signature = request.headers.get("x-twilio-signature");
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`;

  // No user session exists for a webhook call, so this is a legitimate,
  // narrowly-scoped use of the service-role client.
  const admin = createAdminClient();

  const to = normalizePhone((paramsObject.To ?? "").replace("whatsapp:", ""));
  const from = normalizePhone((paramsObject.From ?? "").replace("whatsapp:", ""));
  if (!to || !from) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const { data: credential, error: credentialError } = await admin
    .from("whatsapp_credentials")
    .select("clinic_id, twilio_subaccount_sid, twilio_subaccount_auth_token")
    .eq("whatsapp_number_e164", to)
    .maybeSingle();

  if (credentialError) {
    // Not "unknown number" -- a real lookup failure. Surface it instead of
    // silently dropping every message on this number (this is exactly the
    // class of bug the unique constraint on whatsapp_number_e164 exists to
    // prevent, but a lookup error is still worth logging loudly).
    console.error(
      `[whatsapp webhook] credential lookup failed for To=${to}:`,
      credentialError.message
    );
    return NextResponse.json({ received: true });
  }
  if (!credential) return NextResponse.json({ received: true }); // unknown number -- ignore

  // Signature is verified using the SUBACCOUNT's own auth token -- forging
  // a valid signature requires already knowing it, so an attacker can't
  // produce one just by guessing which clinic's number to target.
  const validSignature =
    !!signature &&
    twilio.validateRequest(
      credential.twilio_subaccount_auth_token,
      signature,
      webhookUrl,
      paramsObject
    );
  if (!validSignature) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const clinicId = credential.clinic_id;

  const { data: existingPatient } = await admin
    .from("patients")
    .select("id, name")
    .eq("clinic_id", clinicId)
    .eq("whatsapp_number", from)
    .maybeSingle();

  let patientId = existingPatient?.id as string | undefined;
  let patientName = existingPatient?.name as string | undefined;

  if (!patientId) {
    patientName = paramsObject.ProfileName || `WhatsApp ${from}`;

    const { data: newPatient, error: patientErr } = await admin
      .from("patients")
      .insert({ clinic_id: clinicId, name: patientName, whatsapp_number: from })
      .select("id")
      .single();

    if (patientErr || !newPatient) return NextResponse.json({ received: true });
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

    if (convErr || !newConversation) return NextResponse.json({ received: true });
    conversationId = newConversation.id;
  }

  let body = paramsObject.Body ?? "";
  let mediaUrl: string | null = null;
  let mediaType: "image" | "document" | "video" | "audio" | null = null;
  let mediaFilename: string | null = null;

  const numMedia = Number(paramsObject.NumMedia ?? "0");
  if (numMedia > 0) {
    const sourceUrl = paramsObject.MediaUrl0;
    const mimeType = paramsObject.MediaContentType0 ?? "application/octet-stream";
    mediaType = classifyMediaType(mimeType);

    if (sourceUrl) {
      // Twilio's media URLs are directly fetchable with the same
      // subaccount Basic Auth used for the Senders/Messaging API -- no
      // two-step download-URL exchange like Meta required.
      const auth = Buffer.from(
        `${credential.twilio_subaccount_sid}:${credential.twilio_subaccount_auth_token}`
      ).toString("base64");
      const mediaRes = await fetch(sourceUrl, { headers: { Authorization: `Basic ${auth}` } });

      if (mediaRes.ok) {
        const bytes = await mediaRes.arrayBuffer();
        const ext = MEDIA_EXTENSION_BY_MIME[mimeType] ?? mimeType.split("/")[1] ?? "bin";
        const filename = `${mediaType ?? "file"}-${Date.now()}.${ext}`;
        const path = `${clinicId}/inbound/${Date.now()}-${filename}`;

        const { error: uploadErr } = await admin.storage
          .from("chat-media")
          .upload(path, bytes, { contentType: mimeType });

        if (!uploadErr) {
          const { data: publicUrl } = admin.storage.from("chat-media").getPublicUrl(path);
          mediaUrl = publicUrl.publicUrl;
          mediaFilename = filename;
        }
      }
    }

    if (!mediaUrl) {
      body = body || `[${mediaType ?? "media"} message -- could not be downloaded]`;
    }
  }

  await admin.from("messages").insert({
    conversation_id: conversationId,
    clinic_id: clinicId,
    patient_id: patientId,
    direction: "inbound",
    source: "inbound",
    body,
    media_url: mediaUrl,
    media_type: mediaType,
    media_filename: mediaFilename,
    provider_message_id: paramsObject.MessageSid ?? null,
    status: "delivered",
  });

  // pricing.md Section 1: inbound counts against the pool too -- both
  // directions cost real money via Twilio, and this must run even at 0
  // balance (inbound is still received/stored, just clamped at 0 rather
  // than going negative).
  await deductMessageUnits(clinicId);

  // If this patient has a follow-up nudge awaiting a reply, this inbound
  // message counts as them responding -- Milestone 9's "Contacted" status.
  await admin
    .from("follow_ups")
    .update({ status: "contacted" })
    .eq("patient_id", patientId)
    .eq("status", "due");

  const notificationBody = mediaType
    ? { image: "📷 Photo", document: "📄 Document", video: "🎥 Video", audio: "🎵 Audio" }[mediaType]
    : body || "New message";

  await sendPushToClinic(clinicId, {
    title: patientName ?? "New WhatsApp message",
    body: notificationBody,
    url: `/clinic/inbox/${conversationId}`,
  });

  return NextResponse.json({ received: true });
}
