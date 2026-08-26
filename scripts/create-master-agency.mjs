// Creates the ONE real, permanent agency_admin account that owns every
// clinic created through the public self-signup flow (clinics.created_by).
// Not disposable -- never deleted by cleanup scripts.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

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

const email = "agency@digitalnurse.in";
const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "") + "!Aa1";

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "agency_admin", full_name: "Digital Nurse" },
});
if (error) throw new Error(error.message);

console.log(JSON.stringify({ id: data.user.id, email, password }, null, 2));
