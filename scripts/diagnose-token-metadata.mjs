// Diagnostic: inspects the stored access token's metadata via Meta's
// /debug_token endpoint (app id, scopes, expiry, validity) WITHOUT ever
// printing the token itself -- to figure out why #131005 Access Denied
// persists even after the token was supposedly refreshed.

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

const { data: credential, error } = await admin
  .from("whatsapp_credentials")
  .select("phone_number_id, waba_id, meta_app_id, access_token, updated_at")
  .limit(1)
  .single();
if (error || !credential) throw new Error("No whatsapp_credentials row found.");

console.log("Stored credential row (no secrets):");
console.log("  phone_number_id:", credential.phone_number_id);
console.log("  waba_id:", credential.waba_id);
console.log("  meta_app_id:", credential.meta_app_id);
console.log("  updated_at:", credential.updated_at);
console.log("  access_token length:", credential.access_token?.length);
console.log("  access_token last 6 chars:", credential.access_token?.slice(-6));

const res = await fetch(
  `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(credential.access_token)}&access_token=${encodeURIComponent(credential.access_token)}`
);
const json = await res.json();
console.log("\ndebug_token response:");
console.log(JSON.stringify(json, null, 2));

// Also check what the phone number ID itself resolves to, to make sure
// it's still the right number under this token.
const phoneRes = await fetch(
  `https://graph.facebook.com/v21.0/${credential.phone_number_id}?fields=display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(credential.access_token)}`
);
const phoneJson = await phoneRes.json();
console.log("\nphone number lookup response:");
console.log(JSON.stringify(phoneJson, null, 2));
