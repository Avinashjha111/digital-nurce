// Meta WhatsApp Cloud API: message template creation + status sync.
// Server-only, same convention as provider.ts -- credentials are passed in,
// never read from a global env var, since they're per-clinic.

import { metaErrorMessage } from "./provider";

const GRAPH_API_VERSION = "v21.0";

export type CreateTemplateResult =
  | { ok: true; metaTemplateId: string; status: string }
  | { ok: false; error: string };

/** Extracts {{1}}, {{2}}, ... in order of first appearance, de-duplicated. */
export function extractPlaceholders(bodyText: string): number[] {
  const found = new Set<number>();
  for (const match of bodyText.matchAll(/\{\{(\d+)\}\}/g)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Meta rejects a template if a variable sits at the very start, or if
 * nothing but punctuation follows the last variable at the end (a lone "."
 * after {{2}} does NOT count as real trailing text to Meta's validator --
 * confirmed against the live API, not just documentation).
 */
export function hasLeadingOrTrailingVariable(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^\{\{\d+\}\}/.test(trimmed)) return true;
  if (/\{\{\d+\}\}[\s.,!?;:'"-]*$/.test(trimmed)) return true;
  return false;
}

export type TemplateButtonInput =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string }
  | { type: "PHONE_NUMBER"; text: string; phoneNumber: string }
  | { type: "COPY_CODE"; example: string };

export type TemplateHeaderInput =
  | { type: "none" }
  | { type: "text"; text: string; example?: string }
  | { type: "image" | "video" | "document"; handle: string }
  | { type: "location" };

function buildButtonComponent(buttons: TemplateButtonInput[]) {
  return {
    type: "BUTTONS",
    buttons: buttons.map((b) => {
      switch (b.type) {
        case "QUICK_REPLY":
          return { type: "QUICK_REPLY", text: b.text };
        case "URL":
          return { type: "URL", text: b.text, url: b.url };
        case "PHONE_NUMBER":
          return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phoneNumber };
        case "COPY_CODE":
          return { type: "COPY_CODE", example: b.example };
      }
    }),
  };
}

function buildHeaderComponent(header: TemplateHeaderInput) {
  switch (header.type) {
    case "none":
      return null;
    case "text": {
      const component: Record<string, unknown> = {
        type: "HEADER",
        format: "TEXT",
        text: header.text,
      };
      if (header.example) component.example = { header_text: [header.example] };
      return component;
    }
    case "image":
    case "video":
    case "document":
      return {
        type: "HEADER",
        format: header.type.toUpperCase(),
        example: { header_handle: [header.handle] },
      };
    case "location":
      return { type: "HEADER", format: "LOCATION" };
  }
}

export async function createWhatsAppTemplate({
  wabaId,
  accessToken,
  name,
  category,
  language,
  bodyText,
  examples,
  header,
  footerText,
  buttons,
}: {
  wabaId: string;
  accessToken: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  bodyText: string;
  examples: string[];
  header: TemplateHeaderInput;
  footerText: string | null;
  buttons: TemplateButtonInput[];
}): Promise<CreateTemplateResult> {
  const bodyComponent: Record<string, unknown> = {
    type: "BODY",
    text: bodyText,
  };
  if (examples.length > 0) {
    bodyComponent.example = { body_text: [examples] };
  }

  const components: unknown[] = [];
  const headerComponent = buildHeaderComponent(header);
  if (headerComponent) components.push(headerComponent);
  components.push(bodyComponent);
  if (footerText) components.push({ type: "FOOTER", text: footerText });
  if (buttons.length > 0) components.push(buildButtonComponent(buttons));

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, category, language, components }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: metaErrorMessage(json, `Meta API error (${res.status})`) };
  }

  return {
    ok: true,
    metaTemplateId: json.id,
    status: (json.status ?? "PENDING").toLowerCase(),
  };
}

export type TemplateStatusResult =
  | { ok: true; status: string; rejectionReason: string | null }
  | { ok: false; error: string };

export async function fetchTemplateStatus({
  metaTemplateId,
  accessToken,
}: {
  metaTemplateId: string;
  accessToken: string;
}): Promise<TemplateStatusResult> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${metaTemplateId}?fields=status,rejected_reason`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: metaErrorMessage(json, `Meta API error (${res.status})`) };
  }

  return {
    ok: true,
    status: (json.status ?? "PENDING").toLowerCase(),
    rejectionReason: json.rejected_reason && json.rejected_reason !== "NONE" ? json.rejected_reason : null,
  };
}

export type UploadMediaResult = { ok: true; handle: string } | { ok: false; error: string };

/**
 * Meta's Resumable Upload API (three calls): open a session sized for this
 * exact file, push the bytes, get back a handle usable as a template
 * header's example.header_handle. Needs the Meta App ID, which is
 * unrelated to the WABA/phone number IDs used everywhere else here.
 */
export async function uploadTemplateHeaderMedia({
  appId,
  accessToken,
  fileBytes,
  mimeType,
}: {
  appId: string;
  accessToken: string;
  fileBytes: Uint8Array;
  mimeType: string;
}): Promise<UploadMediaResult> {
  const sessionRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${appId}/uploads?file_length=${fileBytes.length}&file_type=${encodeURIComponent(mimeType)}&access_token=${encodeURIComponent(accessToken)}`,
    { method: "POST" }
  );
  const sessionJson = await sessionRes.json().catch(() => null);

  if (!sessionRes.ok || !sessionJson?.id) {
    return {
      ok: false,
      error: metaErrorMessage(sessionJson, `Could not start upload session (${sessionRes.status})`),
    };
  }

  const uploadRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${sessionJson.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
    },
    body: fileBytes.slice().buffer as ArrayBuffer,
  });
  const uploadJson = await uploadRes.json().catch(() => null);

  if (!uploadRes.ok || !uploadJson?.h) {
    return {
      ok: false,
      error: metaErrorMessage(uploadJson, `Media upload failed (${uploadRes.status})`),
    };
  }

  return { ok: true, handle: uploadJson.h };
}
