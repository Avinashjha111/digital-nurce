// Thin wrapper around Razorpay's REST API. Server-only: reads the account
// keys from env vars, never from client code or a per-clinic table (this
// is Digital Nurse's own Razorpay account -- one merchant, not per-clinic
// like the WhatsApp credentials are).
import crypto from "node:crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export type CreatePaymentLinkResult =
  | { ok: true; id: string; shortUrl: string }
  | { ok: false; error: string };

export async function createRazorpayPaymentLink({
  amountRupees,
  description,
  notes,
}: {
  amountRupees: number;
  description: string;
  notes: Record<string, string>;
}): Promise<CreatePaymentLinkResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "Razorpay is not configured." };

  const res = await fetch(`${RAZORPAY_API_BASE}/payment_links`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100), // Razorpay wants paise
      currency: "INR",
      description,
      notes,
      reminder_enable: true,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, error: json?.error?.description ?? `Razorpay API error (${res.status})` };
  }

  return { ok: true, id: json.id, shortUrl: json.short_url };
}

/** HMAC-SHA256 signature check, same shape as the WhatsApp webhook's. */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
  } catch {
    return false;
  }
}
