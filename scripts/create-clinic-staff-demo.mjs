// Creates one clinic_admin demo account assigned to the first existing
// clinic, for manual browser testing of the clinic-side patient flow.

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

const { data: clinics, error: clinicsErr } = await admin
  .from("clinics")
  .select("id, name")
  .limit(1);
if (clinicsErr || !clinics?.length) {
  throw new Error("No clinic found. Create one first via the Agency dashboard.");
}
const clinic = clinics[0];

const email = `browsertest-clinicstaff-${Date.now()}@example.test`;
const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "") + "!Aa1";

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "clinic_admin", full_name: "Demo Clinic Staff", clinic_id: clinic.id },
});
if (error) throw new Error(error.message);

const out = { id: data.user.id, email, password, clinicId: clinic.id, clinicName: clinic.name };
console.log(JSON.stringify(out, null, 2));

const { writeFileSync } = await import("node:fs");
writeFileSync(new URL("../.clinic-staff-test-user.json", import.meta.url), JSON.stringify(out, null, 2));
