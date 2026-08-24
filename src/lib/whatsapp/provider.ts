// Thin wrapper around the Meta WhatsApp Cloud API. Server-only: every
// function here takes the access token as an argument rather than reading
// it from a global env var, because tokens are per-clinic (stored in
// public.whatsapp_credentials, never in the frontend bundle).

const GRAPH_API_VERSION = "v21.0";

// Meta's error_user_msg is the specific, actionable reason (e.g. "Variables
// can't be at the start or end of the template"); error.message is often
// just a generic "Invalid parameter" that hides it.
export function metaErrorMessage(json: unknown, fallback: string): string {
  const error = (json as { error?: { error_user_msg?: string; message?: string } } | null)
    ?.error;
  return error?.error_user_msg ?? error?.message ?? fallback;
}

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
      error: metaErrorMessage(json, `WhatsApp API error (${res.status})`),
    };
  }

  const providerMessageId = json?.messages?.[0]?.id;
  if (!providerMessageId) {
    return { ok: false, error: "WhatsApp API did not return a message id." };
  }

  return { ok: true, providerMessageId };
}

export async function sendWhatsAppTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode,
  parameters,
  headerParameter,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
  headerParameter?: string;
}): Promise<SendMessageResult> {
  const components: unknown[] = [];
  if (headerParameter) {
    components.push({
      type: "header",
      parameters: [{ type: "text", text: headerParameter }],
    });
  }
  if (parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map((text) => ({ type: "text", text })),
    });
  }

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
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: metaErrorMessage(json, `WhatsApp API error (${res.status})`),
    };
  }

  const providerMessageId = json?.messages?.[0]?.id;
  if (!providerMessageId) {
    return { ok: false, error: "WhatsApp API did not return a message id." };
  }

  return { ok: true, providerMessageId };
}

export async function sendWhatsAppMediaMessage({
  phoneNumberId,
  accessToken,
  to,
  mediaType,
  mediaUrl,
  caption,
  filename,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaType: "image" | "document" | "video" | "audio";
  mediaUrl: string;
  caption?: string;
  filename?: string;
}): Promise<SendMessageResult> {
  const mediaObject: Record<string, string> = { link: mediaUrl };
  if (caption) mediaObject.caption = caption;
  if (mediaType === "document" && filename) mediaObject.filename = filename;

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
        type: mediaType,
        [mediaType]: mediaObject,
      }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: metaErrorMessage(json, `WhatsApp API error (${res.status})`),
    };
  }

  const providerMessageId = json?.messages?.[0]?.id;
  if (!providerMessageId) {
    return { ok: false, error: "WhatsApp API did not return a message id." };
  }

  return { ok: true, providerMessageId };
}

// Inbound media only ever arrives from Meta as a media ID -- fetching it
// is a two-step dance: ask the Graph API for a short-lived download URL,
// then fetch that URL (still bearer-authed) for the actual bytes.
export async function downloadWhatsAppMedia({
  mediaId,
  accessToken,
}: {
  mediaId: string;
  accessToken: string;
}): Promise<{ bytes: ArrayBuffer; mimeType: string } | null> {
  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meta = await metaRes.json().catch(() => null);
  if (!metaRes.ok || !meta?.url) return null;

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) return null;

  return {
    bytes: await fileRes.arrayBuffer(),
    mimeType: meta.mime_type ?? "application/octet-stream",
  };
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
      error: metaErrorMessage(json, `Could not verify credentials (${res.status})`),
    };
  }

  return { ok: true, displayNumber: json?.display_phone_number ?? null };
}
