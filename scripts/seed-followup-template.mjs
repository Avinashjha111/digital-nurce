// One-off: creates a real, Meta-approved WhatsApp template with exactly
// one body placeholder (patient name), matching the follow-up nudge shape
// Milestone 9's scheduler requires, then mirrors it into whatsapp_templates
// so it shows up as an option in the agency's Follow-up Template picker.

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
  .select("clinic_id, waba_id, access_token")
  .limit(1)
  .single();

const templateName = "followup_nudge_test";
const bodyText =
  "Hi {{1}}, your doctor recommended a follow-up visit. Would you like to book an appointment?";

const res = await fetch(
  `https://graph.facebook.com/v21.0/${credential.waba_id}/message_templates`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: templateName,
      category: "UTILITY",
      language: "en_US",
      components: [
        {
          type: "BODY",
          text: bodyText,
          example: { body_text: [["Abhishek"]] },
        },
      ],
    }),
  }
);
const json = await res.json();
console.log("Meta response:", res.status, JSON.stringify(json));

if (!json.id) {
  console.error("Template creation failed.");
  process.exit(1);
}

const { data: row, error } = await admin
  .from("whatsapp_templates")
  .insert({
    clinic_id: credential.clinic_id,
    name: templateName,
    category: "utility",
    language: "en_US",
    body_text: bodyText,
    meta_template_id: json.id,
    status: "approved",
    created_by: (
      await admin.from("users").select("id").eq("role", "agency_admin").limit(1).single()
    ).data.id,
  })
  .select("id")
  .single();

if (error) {
  console.error("Local insert failed:", error);
  process.exit(1);
}

console.log("Seeded local template row:", row.id);
