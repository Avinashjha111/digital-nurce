import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

// Twilio delivers delivery/read status updates (queued/sent/delivered/
// read/failed) to a separate callback URL from inbound messages -- unlike
// Meta, which sent both to the same webhook (see the comment in
// ../route.ts). This is the counterpart to that file's old `statuses` loop.
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

  const { data: message } = await admin
    .from("messages")
    .select("id, clinic_id")
    .eq("provider_message_id", messageSid)
    .maybeSingle();
  if (!message) return NextResponse.json({ received: true }); // unknown message -- ignore

  const { data: credential } = await admin
    .from("whatsapp_credentials")
    .select("twilio_subaccount_auth_token")
    .eq("clinic_id", message.clinic_id)
    .maybeSingle();
  if (!credential) return NextResponse.json({ received: true });

  const signature = request.headers.get("x-twilio-signature");
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/status`;
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

  await admin.from("messages").update({ status: messageStatus }).eq("id", message.id);

  return NextResponse.json({ received: true });
}
