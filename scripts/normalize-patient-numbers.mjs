// One-time data fix: patients created before phone-number normalization was
// added (Milestone 4) may have "+"/spaces/dashes in whatsapp_number. Strips
// them so storage matches what Meta's webhook sends and what the app now
// stores on every new insert.

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

const { data: patients, error } = await admin.from("patients").select("id, whatsapp_number");
if (error) throw new Error(error.message);

for (const p of patients ?? []) {
  const normalized = p.whatsapp_number.replace(/\D/g, "");
  if (normalized !== p.whatsapp_number) {
    const { error: updateErr } = await admin
      .from("patients")
      .update({ whatsapp_number: normalized })
      .eq("id", p.id);
    console.log(`${updateErr ? "FAILED" : "normalized"}: ${p.id} (${p.whatsapp_number} -> ${normalized})`);
  }
}
console.log("done");
