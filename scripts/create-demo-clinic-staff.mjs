// Creates one persistent clinic_admin demo account, assigned to the first
// existing clinic, for manual login (mirrors create-demo-admin.mjs).

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

const email = "demo.clinic@digitalnurse.test";
const password = "Demo@" + randomBytes(6).toString("hex");

const { data: existing } = await admin.auth.admin.listUsers();
const already = existing.users.find((u) => u.email === email);

if (already) {
  const { error } = await admin.auth.admin.updateUserById(already.id, { password });
  if (error) throw new Error(error.message);
  // Make sure clinic_id is still correct even if this runs again later.
  await admin.from("users").update({ clinic_id: clinic.id }).eq("id", already.id);
  console.log("Existing demo clinic-staff account found, password reset.");
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "clinic_admin", full_name: "Demo Clinic Staff", clinic_id: clinic.id },
  });
  if (error) throw new Error(error.message);
  console.log("Demo clinic-staff account created.");
}

console.log("email:", email);
console.log("password:", password);
console.log("clinic:", clinic.name);
