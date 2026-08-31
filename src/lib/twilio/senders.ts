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

// Safe known field names that are allowed to be identified if validation fails
const SAFE_VALIDATION_FIELDS = new Set([
  "profile",
  "profile.name",
  "name",
  "sender_id",
  "phone_number",
  "waba_id",
  "configuration.waba_id",
  "verification_method",
  "configuration.verification_method",
]);

function extractSafeFieldNames(rawDetails: unknown): string[] {
  if (!rawDetails) return [];
  const fieldSet = new Set<string>();

  if (Array.isArray(rawDetails)) {
    for (const item of rawDetails) {
      if (item && typeof item === "object") {
        const field = String(
          (item as { field?: string; property?: string }).field ??
            (item as { property?: string }).property ??
            ""
        ).trim().toLowerCase();
        if (field && SAFE_VALIDATION_FIELDS.has(field)) {
          fieldSet.add(field);
        }
      }
    }
  } else if (typeof rawDetails === "object") {
    for (const key of Object.keys(rawDetails as Record<string, unknown>)) {
      const lowerKey = key.trim().toLowerCase();
      if (SAFE_VALIDATION_FIELDS.has(lowerKey)) {
        fieldSet.add(lowerKey);
      }
    }
  }

  return Array.from(fieldSet);
}

async function parseSenderResponse(
  res: Response
): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (json as { code?: number | string } | null)?.code;
    const rawDetails =
      (json as { details?: unknown } | null)?.details ??
      (json as { errors?: unknown } | null)?.errors;
    const safeFields = extractSafeFieldNames(rawDetails);

    // Safe server-side diagnostic logging: only HTTP status, error code, and safe field names
    console.error("[Twilio Senders API Error]", {
      status: res.status,
      code: code ?? "none",
      invalidFields: safeFields.length > 0 ? safeFields : undefined,
    });

    let clientMessage = "WhatsApp sender registration failed. Please verify the sender details and try again.";
    if (safeFields.length > 0) {
      clientMessage += ` (Invalid fields: ${safeFields.join(", ")})`;
    }

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
  verificationMethod = "sms",
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  wabaId: string;
  phoneE164: string; // digits only, no "+"
  profileName: string;
  verificationMethod?: "sms" | "voice";
}): Promise<{ ok: true; sender: TwilioSender } | SendersApiError> {
  const payload = {
    sender_id: `whatsapp:+${phoneE164}`,
    profile: {
      name: profileName,
    },
    configuration: {
      waba_id: wabaId,
      verification_method: verificationMethod,
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
