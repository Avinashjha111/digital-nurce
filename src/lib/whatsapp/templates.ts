// Meta WhatsApp Cloud API: message template creation + status sync.
// Server-only, same convention as provider.ts -- credentials are passed in,
// never read from a global env var, since they're per-clinic.

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

export async function createWhatsAppTemplate({
  wabaId,
  accessToken,
  name,
  category,
  language,
  bodyText,
  examples,
}: {
  wabaId: string;
  accessToken: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  bodyText: string;
  examples: string[];
}): Promise<CreateTemplateResult> {
  const bodyComponent: Record<string, unknown> = {
    type: "BODY",
    text: bodyText,
  };

  if (examples.length > 0) {
    bodyComponent.example = { body_text: [examples] };
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        language,
        components: [bodyComponent],
      }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: json?.error?.message ?? `Meta API error (${res.status})`,
    };
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
    return { ok: false, error: json?.error?.message ?? `Meta API error (${res.status})` };
  }

  return {
    ok: true,
    status: (json.status ?? "PENDING").toLowerCase(),
    rejectionReason: json.rejected_reason && json.rejected_reason !== "NONE" ? json.rejected_reason : null,
  };
}
