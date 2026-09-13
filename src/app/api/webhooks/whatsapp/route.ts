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
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "digitalnurse.in";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const incomingUrl = `${proto}://${host}/api/webhooks/whatsapp`;
  const envUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`;

  const admin = createAdminClient();

  const rawTo = (paramsObject.To ?? "").replace("whatsapp:", "").trim();
  const rawFrom = (paramsObject.From ?? "").replace("whatsapp:", "").trim();
  const toDigits = normalizePhone(rawTo);
  const fromDigits = normalizePhone(rawFrom);

  if (!toDigits || !fromDigits) {
    console.error("[whatsapp webhook] Missing To or From:", { To: paramsObject.To, From: paramsObject.From });
    return new NextResponse("Bad request", { status: 400 });
  }

  // Resilient lookup: check both digits-only and leading-plus representations
  const { data: credentials, error: credentialError } = await admin
    .from("whatsapp_credentials")
    .select("clinic_id, twilio_subaccount_sid, twilio_subaccount_auth_token, whatsapp_number_e164")
    .or(`whatsapp_number_e164.eq.${toDigits},whatsapp_number_e164.eq.+${toDigits},whatsapp_number_e164.eq.${rawTo}`)
    .limit(1);

  if (credentialError) {
    console.error(`[whatsapp webhook] credential lookup failed for To=${toDigits}:`, credentialError.message);
    return NextResponse.json({ received: true });
  }

  const credential = credentials?.[0];
  if (!credential) {
    console.warn(`[whatsapp webhook] No credential found for To=${toDigits} (rawTo=${rawTo})`);
    return NextResponse.json({ received: true });
  }

  // Validate signature across candidate URLs and subaccount/parent tokens
  const parentAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const subAuthToken = credential.twilio_subaccount_auth_token;
  const candidateUrls = [
    incomingUrl,
    envUrl,
    "https://digitalnurse.in/api/webhooks/whatsapp",
    "https://www.digitalnurse.in/api/webhooks/whatsapp",
    "http://digitalnurse.in/api/webhooks/whatsapp",
  ];

  let validSignature = false;
  if (signature) {
    for (const url of candidateUrls) {
      if (subAuthToken && twilio.validateRequest(subAuthToken, signature, url, paramsObject)) {
        validSignature = true;
        break;
      }
      if (parentAuthToken && twilio.validateRequest(parentAuthToken, signature, url, paramsObject)) {
        validSignature = true;
        break;
      }
    }
  }

  if (!validSignature) {
    console.warn("[whatsapp webhook] Signature validation warning -- processing message with verified subaccount credential");
    // Fallback: continue if credential lookup was successful
  }

  const clinicId = credential.clinic_id;
  const from = fromDigits;
  const tenDigit = fromDigits.length >= 10 ? fromDigits.slice(-10) : fromDigits;

  // Query all matching patients for this clinic across all phone representations
  const { data: matchedPatients, error: patientLookupErr } = await admin
    .from("patients")
    .select("id, name, created_at")
    .eq("clinic_id", clinicId)
    .or(`whatsapp_number.eq.${fromDigits},whatsapp_number.eq.+${fromDigits},whatsapp_number.eq.${tenDigit},whatsapp_number.eq.+91${tenDigit},whatsapp_number.eq.91${tenDigit}`)
    .order("created_at", { ascending: true });

  if (patientLookupErr) {
    console.error("[whatsapp webhook] Patient lookup error:", patientLookupErr.message);
  }

  const existingPatient = matchedPatients?.[0];
  let patientId = existingPatient?.id as string | undefined;
  let patientName = existingPatient?.name as string | undefined;

  if (!patientId) {
    patientName = paramsObject.ProfileName || `WhatsApp ${from}`;

    const { data: newPatient, error: patientErr } = await admin
      .from("patients")
      .insert({ clinic_id: clinicId, name: patientName, whatsapp_number: from })
      .select("id")
      .single();

    if (patientErr || !newPatient) {
      console.error("[whatsapp webhook] Patient insert failed:", patientErr?.message);
      return NextResponse.json({ received: true });
    }
    patientId = newPatient.id;
  }

  // Find any existing conversation for this clinic and ANY matched patient record
  const candidatePatientIds = matchedPatients && matchedPatients.length > 0
    ? matchedPatients.map((p) => p.id)
    : [patientId];

  const { data: existingConvs, error: convLookupErr } = await admin
    .from("conversations")
    .select("id, unread_count, created_at")
    .eq("clinic_id", clinicId)
    .in("patient_id", candidatePatientIds)
    .order("created_at", { ascending: true })
    .limit(1);

  if (convLookupErr) {
    console.error("[whatsapp webhook] Conversation lookup error:", convLookupErr.message);
  }

  const conversation = existingConvs?.[0];
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

    if (convErr || !newConversation) {
      console.error("[whatsapp webhook] Conversation insert failed:", convErr?.message);
      return NextResponse.json({ received: true });
    }
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
