// Thin wrapper around the Meta WhatsApp Cloud API. Server-only: every
// function here takes the access token as an argument rather than reading
// it from a global env var, because tokens are per-clinic (stored in
// public.whatsapp_credentials, never in the frontend bundle).

const GRAPH_API_VERSION = "v21.0";

export type SendMessageResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string };

export async function sendWhatsAppMessage({
  phoneNumberId,
  accessToken,
  to,
  body,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<SendMessageResult> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: json?.error?.message ?? `WhatsApp API error (${res.status})`,
    };
  }

  const providerMessageId = json?.messages?.[0]?.id;
  if (!providerMessageId) {
    return { ok: false, error: "WhatsApp API did not return a message id." };
  }

  return { ok: true, providerMessageId };
}

export type VerifyCredentialsResult =
  | { ok: true; displayNumber: string | null }
  | { ok: false; error: string };

export async function verifyWhatsAppCredentials({
  phoneNumberId,
  accessToken,
}: {
  phoneNumberId: string;
  accessToken: string;
}): Promise<VerifyCredentialsResult> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: json?.error?.message ?? `Could not verify credentials (${res.status})`,
    };
  }

  return { ok: true, displayNumber: json?.display_phone_number ?? null };
}
