import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundMessageUnits } from "@/lib/billing";

// Twilio delivers delivery/read status updates (queued/sent/delivered/
// read/failed/undelivered) to a separate callback URL from inbound messages.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  const paramsObject = Object.fromEntries(params.entries());

  const messageSid = paramsObject.MessageSid;
  const messageStatus = paramsObject.MessageStatus;
  if (!messageSid || !messageStatus) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("messages")
    .select("id, clinic_id, status, source")
    .eq("provider_message_id", messageSid)
    .limit(1);
  const message = messages?.[0];
  if (!message) return NextResponse.json({ received: true }); // unknown message -- ignore

  const { data: credentials } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_auth_token")
    .eq("clinic_id", message.clinic_id)
    .limit(1);
  const credential = credentials?.[0];
  if (!credential) return NextResponse.json({ received: true });

  const signature = request.headers.get("x-twilio-signature");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "digitalnurse.in";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const incomingUrl = `${proto}://${host}/api/webhooks/whatsapp/status`;
  const envUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/status`;

  const candidateUrls = [
    incomingUrl,
    envUrl,
    "https://digitalnurse.in/api/webhooks/whatsapp/status",
    "https://www.digitalnurse.in/api/webhooks/whatsapp/status",
    "http://digitalnurse.in/api/webhooks/whatsapp/status",
  ];

  let validSignature = false;
  if (signature) {
    for (const url of candidateUrls) {
      if (credential.twilio_subaccount_auth_token && twilio.validateRequest(credential.twilio_subaccount_auth_token, signature, url, paramsObject)) {
        validSignature = true;
        break;
      }
      if (process.env.TWILIO_AUTH_TOKEN && twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, paramsObject)) {
        validSignature = true;
        break;
      }
    }
  }

  if (!validSignature) {
    console.warn("[whatsapp status webhook] Signature validation warning -- processing status update");
  }

  const isFailed = messageStatus === "failed" || messageStatus === "undelivered";

  // If message failed to deliver and was not previously marked as failed, refund the message units!
  if (isFailed && message.status !== "failed" && message.status !== "undelivered") {
    console.log(`[whatsapp status webhook] Message ${message.id} failed delivery (${messageStatus}) -- refunding unit to clinic ${message.clinic_id}`);
    await refundMessageUnits(message.clinic_id);

    // Also update any linked reminder or follow-up status
    await admin
      .from("reminders")
      .update({ status: "failed", error: `Delivery failed (${messageStatus})` })
      .eq("provider_message_id", messageSid);

    await admin
      .from("follow_ups")
      .update({ status: "due", error: `Delivery failed (${messageStatus})` })
      .eq("provider_message_id", messageSid);
  }

  await admin.from("messages").update({ status: isFailed ? "failed" : messageStatus }).eq("id", message.id);

  return NextResponse.json({ received: true });
}
