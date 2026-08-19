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
  .select("phone_number_id, access_token")
  .limit(1)
  .single();

const res = await fetch(
  `https://graph.facebook.com/v21.0/${credential.phone_number_id}/messages`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: "918340321285",
      type: "text",
      text: { body: "diagnostic: plain text send test" },
    }),
  }
);

const json = await res.json();
console.log("HTTP status:", res.status);
console.log(JSON.stringify(json, null, 2));
