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

// Safe parser for Twilio API validation errors and details
function extractSafeErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  const detailParts: string[] = [];

  const details = obj.details ?? obj.errors;
  if (Array.isArray(details)) {
    for (const item of details) {
      if (item && typeof item === "object") {
        const prop = (item as Record<string, unknown>).property ?? (item as Record<string, unknown>).field;
        const msg = (item as Record<string, unknown>).message ?? (item as Record<string, unknown>).description;
        if (prop && msg) {
          detailParts.push(`${String(prop)}: ${String(msg)}`);
        } else if (msg) {
          detailParts.push(String(msg));
        } else if (prop) {
          detailParts.push(String(prop));
        }
      } else if (typeof item === "string" && item.trim()) {
        detailParts.push(item.trim());
      }
    }
  } else if (details && typeof details === "object") {
    const d = details as Record<string, unknown>;
    if (d.error_user_msg) {
      detailParts.push(String(d.error_user_msg));
    } else if (d.message) {
      detailParts.push(String(d.message));
    } else {
      for (const [k, v] of Object.entries(d)) {
        if (typeof v === "string" || typeof v === "number") {
          detailParts.push(`${k}: ${v}`);
        }
      }
    }
  } else if (typeof details === "string" && details.trim()) {
    detailParts.push(details.trim());
  }

  if (detailParts.length > 0) {
    return detailParts.join("; ");
  }

  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message.trim();
  }

  return null;
}

async function parseSenderResponse(
  res: Response
): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (json as { code?: number | string } | null)?.code;
    const detailMsg = extractSafeErrorMessage(json);

    // Safe server-side diagnostic logging
    console.error("[Twilio Senders API Error]", {
      status: res.status,
      code: code ?? "none",
      details: detailMsg ?? undefined,
    });

    let clientMessage =
      detailMsg ||
      "WhatsApp sender registration failed. Please verify the sender details and try again.";

    if (code) {
      clientMessage = `[Error ${code}] ${clientMessage}`;
    }

    return { ok: false, error: clientMessage };
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
  profileName,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  wabaId: string;
  phoneE164: string; // digits only, no "+"
  profileName: string;
}): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const payload = {
    sender_id: `whatsapp:+${phoneE164}`,
    profile: {
      name: profileName,
    },
    configuration: {
      waba_id: wabaId,
    },
  };

  const res = await fetch(SENDERS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
