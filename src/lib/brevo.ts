// Transactional email via Brevo's HTTP API -- used only for the
// admin "new clinic signed up" notification. Supabase's own auth emails
// (signup/login OTP) go through Supabase's custom SMTP setup instead, not
// this.
export async function sendBrevoEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "BREVO_API_KEY is not configured." };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Digital Nurse", email: "noreply@digitalnurse.in" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Brevo API error (${res.status}): ${body}` };
  }

  return { ok: true };
}
