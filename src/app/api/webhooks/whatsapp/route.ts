import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/provider";
import { sendPushToClinic } from "@/lib/push";
import { deductMessageUnits } from "@/lib/billing";

const MEDIA_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

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
          image?: { id?: string; caption?: string; mime_type?: string };
          document?: { id?: string; caption?: string; filename?: string; mime_type?: string };
          video?: { id?: string; caption?: string; mime_type?: string };
          audio?: { id?: string; mime_type?: string };
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

      const { data: credential, error: credentialError } = await admin
        .from("whatsapp_credentials")
        .select("clinic_id, access_token")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (credentialError) {
        // Not "unknown number" -- a real lookup failure (e.g. the unique
        // constraint being violated somehow and this returning >1 row).
        // Surface it instead of silently dropping every message on this
        // number, which is exactly what happened before that constraint
        // existed.
        console.error(
          `[whatsapp webhook] credential lookup failed for phone_number_id=${phoneNumberId}:`,
          credentialError.message
        );
        continue;
      }
      if (!credential) continue; // unknown phone number id -- ignore
      const clinicId = credential.clinic_id;

      for (const msg of value?.messages ?? []) {
        const from = normalizePhone(msg.from ?? "");
        if (!from) continue;

        const { data: existingPatient } = await admin
          .from("patients")
          .select("id, name")
          .eq("clinic_id", clinicId)
          .eq("whatsapp_number", from)
          .maybeSingle();

        let patientId = existingPatient?.id as string | undefined;
        let patientName = existingPatient?.name as string | undefined;

        if (!patientId) {
          const contactName = value?.contacts?.find(
            (c) => normalizePhone(c.wa_id ?? "") === from
          )?.profile?.name;
          patientName = contactName || `WhatsApp ${from}`;

          const { data: newPatient, error: patientErr } = await admin
            .from("patients")
            .insert({
              clinic_id: clinicId,
              name: patientName,
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

        let body = msg.text?.body ?? "";
        let mediaUrl: string | null = null;
        let mediaType: "image" | "document" | "video" | "audio" | null = null;
        let mediaFilename: string | null = null;

        const inboundMedia =
          msg.type === "image"
            ? { id: msg.image?.id, type: "image" as const, caption: msg.image?.caption }
            : msg.type === "document"
              ? {
                  id: msg.document?.id,
                  type: "document" as const,
                  caption: msg.document?.caption,
                  filename: msg.document?.filename,
                }
              : msg.type === "video"
                ? { id: msg.video?.id, type: "video" as const, caption: msg.video?.caption }
                : msg.type === "audio"
                  ? { id: msg.audio?.id, type: "audio" as const }
                  : null;

        if (inboundMedia?.id) {
          body = inboundMedia.caption ?? "";
          const downloaded = await downloadWhatsAppMedia({
            mediaId: inboundMedia.id,
            accessToken: credential.access_token,
          });

          if (downloaded) {
            const ext =
              MEDIA_EXTENSION_BY_MIME[downloaded.mimeType] ??
              downloaded.mimeType.split("/")[1] ??
              "bin";
            const filename =
              "filename" in inboundMedia && inboundMedia.filename
                ? inboundMedia.filename
                : `${inboundMedia.type}-${Date.now()}.${ext}`;
            const path = `${clinicId}/inbound/${Date.now()}-${filename}`;

            const { error: uploadErr } = await admin.storage
              .from("chat-media")
              .upload(path, downloaded.bytes, { contentType: downloaded.mimeType });

            if (!uploadErr) {
              const { data: publicUrl } = admin.storage.from("chat-media").getPublicUrl(path);
              mediaUrl = publicUrl.publicUrl;
              mediaType = inboundMedia.type;
              mediaFilename = filename;
            }
          }

          if (!mediaUrl) {
            body = body || `[${inboundMedia.type} message -- could not be downloaded]`;
          }
        } else if (!body && msg.type) {
          body = `[${msg.type} message]`;
        }

        await admin.from("messages").insert({
          conversation_id: conversationId,
          clinic_id: clinicId,
          patient_id: patientId,
          direction: "inbound",
          body,
          media_url: mediaUrl,
          media_type: mediaType,
          media_filename: mediaFilename,
          provider_message_id: msg.id ?? null,
          status: "delivered",
        });

        // pricing.md Section 1: inbound counts against the pool too --
        // both directions cost real money via Twilio/Meta, and this must
        // run even at 0 balance (inbound is still received/stored, just
        // clamped at 0 rather than going negative).
        await deductMessageUnits(clinicId);

        // If this patient has a follow-up nudge awaiting a reply, this
        // inbound message counts as them responding -- Milestone 9's
        // "Contacted" status.
        await admin
          .from("follow_ups")
          .update({ status: "contacted" })
          .eq("patient_id", patientId)
          .eq("status", "due");

        const notificationBody = mediaType
          ? { image: "📷 Photo", document: "📄 Document", video: "🎥 Video", audio: "🎵 Audio" }[
              mediaType
            ]
          : body || "New message";

        await sendPushToClinic(clinicId, {
          title: patientName ?? "New WhatsApp message",
          body: notificationBody,
          url: `/clinic/inbox/${conversationId}`,
        });
      }

      for (const status of value?.statuses ?? []) {
        if (!status.id || !status.status) continue;
        await admin.from("messages").update({ status: status.status }).eq("provider_message_id", status.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
