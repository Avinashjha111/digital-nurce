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

const createdNames = [];

async function tryBody(label, bodyText) {
  const name = `diag_${label}_${Date.now()}`;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${credential.waba_id}/message_templates`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${credential.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: "UTILITY",
        language: "en_US",
        components: [
          { type: "BODY", text: bodyText, example: { body_text: [["Rahul", "20-Aug-2026, 5 PM"]] } },
        ],
      }),
    }
  );
  const json = await res.json();
  console.log(`\n--- ${label} ---`);
  console.log("body:", JSON.stringify(bodyText));
  console.log(
    "status:",
    res.status,
    json.error ? `ERROR: ${json.error.error_user_msg || json.error.message}` : `OK id=${json.id}`
  );
  if (json.id) createdNames.push({ name, id: json.id });
  return json;
}

await tryBody("period_only", "Hi {{1}}, your appointment is confirmed for {{2}}.");
await tryBody("with_word", "Hi {{1}}, your appointment is confirmed for {{2}} today.");

// Clean up any that succeeded so we don't leave clutter behind.
for (const t of createdNames) {
  await fetch(
    `https://graph.facebook.com/v21.0/${t.id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${credential.access_token}` } }
  );
  console.log("cleaned up:", t.name);
}
