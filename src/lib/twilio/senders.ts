// Twilio's WhatsApp Senders API v2 (v1 is deprecated Sept 2026). Not yet
// present in the installed `twilio` SDK's typed resources
// (`messaging.v2.channels` is undefined as of twilio@6.1.0), so these call
// the REST endpoints directly with Basic Auth -- same Account SID/Auth
// Token pair used everywhere else, just Base64-encoded per Twilio's usual
// convention.
//
// Registration is per-clinic-SUBACCOUNT, not the parent account (confirmed
// against Twilio's own Tech Provider integration guide: "A single Twilio
// account or subaccount is mapped to a single WABA").

const SENDERS_API_BASE = "https://messaging.twilio.com/v2/Channels/Senders";

function basicAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export type TwilioSender = {
  sid: string;
  senderId: string;
  status: string;
};

type SendersApiError = { ok: false; error: string };

async function parseSenderResponse(
  res: Response
): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json as { message?: string; detail?: string } | null)?.message ??
      (json as { message?: string; detail?: string } | null)?.detail ??
      `Twilio Senders API error (${res.status})`;
    return { ok: false, error: message };
  }
  return {
    ok: true,
    sender: {
      sid: json?.sid,
      senderId: json?.sender_id,
      status: json?.status,
    },
  };
}

// Registers a WhatsApp number as a Twilio Sender for this clinic's WABA
// (obtained from the Embedded Signup FINISH event). Asynchronous on
// Twilio's side -- the returned status is a starting point, not final;
// poll with getSenderStatus() until it reaches "ONLINE".
export async function registerSender({
  subaccountSid,
  subaccountAuthToken,
  wabaId,
  phoneE164,
  verificationMethod = "sms",
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  wabaId: string;
  phoneE164: string; // digits only, no "+"
  verificationMethod?: "sms" | "voice";
}): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const res = await fetch(SENDERS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_id: `whatsapp:+${phoneE164}`,
      configuration: {
        waba_id: wabaId,
        verification_method: verificationMethod,
      },
    }),
  });
  return parseSenderResponse(res);
}

export async function getSenderStatus({
  subaccountSid,
  subaccountAuthToken,
  senderSid,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  senderSid: string;
}): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const res = await fetch(`${SENDERS_API_BASE}/${senderSid}`, {
    headers: { Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken) },
  });
  return parseSenderResponse(res);
}

// Only needed if Twilio comes back asking for phone verification -- not
// every sender registration requires this (confirmed unclear from
// available docs; the caller checks the status/response after
// registerSender() and only prompts for a code if asked).
export async function verifySenderOtp({
  subaccountSid,
  subaccountAuthToken,
  senderSid,
  verificationCode,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  senderSid: string;
  verificationCode: string;
}): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const res = await fetch(`${SENDERS_API_BASE}/${senderSid}`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ verification_code: verificationCode }),
  });
  return parseSenderResponse(res);
}
