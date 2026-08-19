// Diagnostic: submit a full template (header text + body + footer + 2
// buttons) directly to Meta and print the FULL error detail.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value && !process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: credential } = await admin
  .from("whatsapp_credentials")
  .select("waba_id, access_token")
  .limit(1)
  .single();

const body = {
  name: `diag_full_template_${Date.now()}`,
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Appointment Reminder for {{1}}",
      example: { header_text: ["Rahul"] },
    },
    {
      type: "BODY",
      text: "Hi {{1}}, your appointment is confirmed for {{2}}.",
      example: { body_text: [["Rahul", "20-Aug-2026, 5 PM"]] },
    },
    { type: "FOOTER", text: "Reply STOP to opt out" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "URL", text: "Visit Clinic", url: "https://example.com/clinic" },
        { type: "PHONE_NUMBER", text: "Call Clinic", phone_number: "+919876543210" },
      ],
    },
  ],
};

console.log("Request body:", JSON.stringify(body, null, 2));

const res = await fetch(
  `https://graph.facebook.com/v21.0/${credential.waba_id}/message_templates`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }
);

const json = await res.json();
console.log("\nHTTP status:", res.status);
console.log(JSON.stringify(json, null, 2));
