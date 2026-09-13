// Twilio Content API: message template creation + WhatsApp approval status
// sync. Server-only, same convention as provider.ts -- credentials are
// passed in, never read from a global env var, since each clinic's
// templates belong to its own Twilio subaccount.
//
// Scope note: only plain text bodies + variables + quick-reply buttons +
// URL/phone buttons are implemented, using field shapes confirmed directly
// against Twilio's live Content API docs. Media headers, footer text, and
// copy-code buttons are NOT implemented -- their exact Content API field
// shapes aren't documented anywhere reachable, and guessing them risks
// silently creating malformed templates. None of this blocks reminders/
// follow-ups/bulk-send, which only ever need a plain text body with
// variables. If you need one of the unsupported pieces, get a real
// approved-template example from Twilio support/docs first.

const CONTENT_API_BASE = "https://content.twilio.com/v1/Content";

function basicAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

function twilioApiErrorMessage(json: unknown, fallback: string): string {
  const message = (json as { message?: string } | null)?.message;
  return message ?? fallback;
}

/** Extracts {{1}}, {{2}}, ... in order of first appearance, de-duplicated. */
export function extractPlaceholders(bodyText: string): number[] {
  const found = new Set<number>();
  for (const match of bodyText.matchAll(/\{\{(\d+)\}\}/g)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * WhatsApp (via Meta, which Twilio submits to under the hood) rejects a
 * template if a variable sits at the very start, or if nothing but
 * punctuation follows the last variable at the end.
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
  | { type: "PHONE_NUMBER"; text: string; phoneNumber: string };

export type TemplateHeaderType = "none" | "text" | "image" | "video" | "document";

export type CreateTemplateResult =
  | { ok: true; contentSid: string }
  | { ok: false; error: string };

export type CreateWhatsAppTemplateOptions = {
  subaccountSid: string;
  subaccountAuthToken: string;
  name: string;
  language: string;
  bodyText: string;
  examples: string[];
  buttons: TemplateButtonInput[];
  headerType?: TemplateHeaderType;
  headerText?: string;
  mediaUrl?: string;
  footerText?: string;
};

export async function createWhatsAppTemplate({
  subaccountSid,
  subaccountAuthToken,
  name,
  language,
  bodyText,
  examples,
  buttons,
  headerType = "none",
  headerText,
  mediaUrl,
  footerText,
}: CreateWhatsAppTemplateOptions): Promise<CreateTemplateResult> {
  const variables: Record<string, string> = {};
  examples.forEach((value, i) => {
    variables[String(i + 1)] = value;
  });

  const quickReplies = buttons.filter((b) => b.type === "QUICK_REPLY");
  const ctaButtons = buttons.filter((b) => b.type === "URL" || b.type === "PHONE_NUMBER");
  if (quickReplies.length > 0 && ctaButtons.length > 0) {
    return {
      ok: false,
      error: "Mixing quick-reply buttons with URL/phone buttons in one template isn't supported.",
    };
  }

  const isMedia = headerType === "image" || headerType === "video" || headerType === "document";
  
  // Default clean fallback samples if media URL is missing or for approval
  const sampleMedia = mediaUrl || (
    headerType === "video"
      ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
      : headerType === "document"
      ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      : "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
  );

  const actions = [
    ...quickReplies.map((b) => ({ type: "QUICK_REPLY", title: b.text, id: b.text })),
    ...ctaButtons.map((b) =>
      b.type === "URL"
        ? { type: "URL", title: b.text, url: b.url }
        : { type: "PHONE_NUMBER", title: b.text, phone: `+${b.phoneNumber}` }
    ),
  ];

  let types: Record<string, unknown> = {};

  if (isMedia) {
    if (actions.length > 0) {
      types = {
        "twilio/card": {
          title: bodyText,
          media: [sampleMedia],
          actions,
        },
      };
    } else {
      types = {
        "twilio/media": {
          body: bodyText,
          media: [sampleMedia],
        },
      };
    }
  } else if (headerType === "text" && headerText) {
    if (actions.length > 0) {
      types = {
        "twilio/card": {
          title: headerText,
          subtitle: bodyText,
          actions,
        },
      };
    } else {
      types = {
        "twilio/card": {
          title: headerText,
          subtitle: bodyText,
        },
      };
    }
  } else {
    // None header
    if (quickReplies.length > 0) {
      types = {
        "twilio/quick-reply": {
          body: bodyText,
          actions: quickReplies.map((b) => ({ title: b.text, id: b.text })),
        },
      };
    } else if (ctaButtons.length > 0) {
      types = {
        "twilio/call-to-action": {
          body: bodyText,
          actions: ctaButtons.map((b) =>
            b.type === "URL"
              ? { type: "URL", title: b.text, url: b.url }
              : { type: "PHONE_NUMBER", title: b.text, phone: `+${b.phoneNumber}` }
          ),
        },
      };
    } else {
      types = {
        "twilio/text": { body: bodyText },
      };
    }
  }

  const res = await fetch(CONTENT_API_BASE, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      friendly_name: name,
      language,
      ...(Object.keys(variables).length > 0 ? { variables } : {}),
      types,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: twilioApiErrorMessage(json, `Twilio API error (${res.status})`) };
  }

  return { ok: true, contentSid: json.sid };
}

export type NormalizedTemplateStatus = "pending" | "approved" | "rejected" | "disabled";

export function normalizeTemplateStatus(rawStatus?: string | null): NormalizedTemplateStatus {
  const s = String(rawStatus ?? "").trim().toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "disabled" || s === "paused") return "disabled";
  // Maps 'received', 'pending', 'submitted', 'in_review', etc. to 'pending'
  return "pending";
}

export type SubmitApprovalResult =
  | { ok: true; status: NormalizedTemplateStatus }
  | { ok: false; error: string };

export async function submitTemplateForApproval({
  subaccountSid,
  subaccountAuthToken,
  contentSid,
  name,
  category,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  contentSid: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
}): Promise<SubmitApprovalResult> {
  const res = await fetch(`${CONTENT_API_BASE}/${contentSid}/ApprovalRequests/whatsapp`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, category }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: twilioApiErrorMessage(json, `Twilio API error (${res.status})`) };
  }

  return { ok: true, status: normalizeTemplateStatus(json?.status) };
}

export type TemplateStatusResult =
  | { ok: true; status: NormalizedTemplateStatus; rejectionReason: string | null }
  | { ok: false; error: string };

export async function fetchTemplateStatus({
  subaccountSid,
  subaccountAuthToken,
  contentSid,
}: {
  subaccountSid: string;
  subaccountAuthToken: string;
  contentSid: string;
}): Promise<TemplateStatusResult> {
  const res = await fetch(`${CONTENT_API_BASE}/${contentSid}/ApprovalRequests`, {
    headers: { Authorization: basicAuthHeader(subaccountSid, subaccountAuthToken) },
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: twilioApiErrorMessage(json, `Twilio API error (${res.status})`) };
  }

  const whatsapp = json?.whatsapp;
  return {
    ok: true,
    status: normalizeTemplateStatus(whatsapp?.status),
    rejectionReason: whatsapp?.rejection_reason || null,
  };
}

