import twilio from "twilio";

// Thin wrapper around Twilio's WhatsApp Messaging API. Server-only: every
// function here takes the subaccount SID/auth token as arguments rather
// than reading a global env var, because they're per-clinic (each clinic
// gets its own Twilio subaccount, stored in public.whatsapp_credentials,
// never in the frontend bundle). The parent/main Twilio account
// (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN) is only ever used to create those
// subaccounts (see src/lib/twilio/subaccounts.ts), never to send messages.

function twilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}

function toWhatsAppAddress(e164Digits: string): string {
  return `whatsapp:+${e164Digits}`;
}

function twilioErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

export type SendMessageResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export async function sendWhatsAppMessage({
  subaccountSid,
  subaccountAuthToken,
  from,
  to,
  body,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  from: string; // digits only (normalizePhone shape), no "+" or "whatsapp:" prefix
  to: string;
  body: string;
}): Promise<SendMessageResult> {
  try {
    const message = await twilioClient(subaccountSid, subaccountAuthToken).messages.create({
      from: toWhatsAppAddress(from),
      to: toWhatsAppAddress(to),
      body,
    });
    return { ok: true, providerMessageId: message.sid };
  } catch (err) {
    return { ok: false, error: twilioErrorMessage(err, "WhatsApp send failed.") };
  }
}

export async function sendWhatsAppMediaMessage({
  subaccountSid,
  subaccountAuthToken,
  from,
  to,
  mediaUrl,
  caption,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  from: string;
  to: string;
  mediaType: "image" | "document" | "video" | "audio";
  mediaUrl: string;
  caption?: string;
  filename?: string;
}): Promise<SendMessageResult> {
  try {
    const message = await twilioClient(subaccountSid, subaccountAuthToken).messages.create({
      from: toWhatsAppAddress(from),
      to: toWhatsAppAddress(to),
      mediaUrl: [mediaUrl],
      ...(caption ? { body: caption } : {}),
    });
    return { ok: true, providerMessageId: message.sid };
  } catch (err) {
    return { ok: false, error: twilioErrorMessage(err, "WhatsApp media send failed.") };
  }
}

// Templates are sent via Twilio's Content API: a template is a Content
// resource (see src/lib/whatsapp/templates.ts for creation/approval), and
// sending it means passing its ContentSid plus the variable values as a
// JSON string keyed by placeholder number ("1", "2", ...) -- this replaces
// Meta's "template name + language + components" sending model, which
// Twilio has no equivalent for.
export async function sendWhatsAppTemplateMessage({
  subaccountSid,
  subaccountAuthToken,
  from,
  to,
  contentSid,
  contentVariables,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  from: string;
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
}): Promise<SendMessageResult> {
  try {
    const message = await twilioClient(subaccountSid, subaccountAuthToken).messages.create({
      from: toWhatsAppAddress(from),
      to: toWhatsAppAddress(to),
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
    });
    return { ok: true, providerMessageId: message.sid };
  } catch (err) {
    return { ok: false, error: twilioErrorMessage(err, "WhatsApp template send failed.") };
  }
}
