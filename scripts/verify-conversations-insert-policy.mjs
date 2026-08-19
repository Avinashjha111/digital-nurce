// Verifies the new clinic-staff INSERT policy on conversations (migration
// 0012): own-clinic insert allowed, cross-clinic insert denied.

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

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const admin = createClient(URL_, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
function anonClient() {
  return createClient(URL_, PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}
function randomPassword() {
  return randomBytes(18).toString("base64");
}

const results = [];
function report(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

async function createTestUser(role, tag, clinicId) {
  const email = `verifyconv-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role, full_name: `VerifyConv ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
  });
  if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`);
  return { id: data.user.id, email, password };
}
async function signIn(email, password) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn ${email}: ${error?.message}`);
  return client;
}

const createdStaffUserIds = [];
const createdOwnerUserIds = [];
const createdClinicIds = [];
async function cleanup() {
  for (const id of createdStaffUserIds) await admin.auth.admin.deleteUser(id);
  for (const id of createdClinicIds) await admin.from("clinics").delete().eq("id", id);
  for (const id of createdOwnerUserIds) await admin.auth.admin.deleteUser(id);
}

async function main() {
  const adminA = await createTestUser("agency_admin", "agency-a");
  createdOwnerUserIds.push(adminA.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA.from("clinics").insert({ name: "VerifyConv Clinic A", created_by: adminA.id }).select("id").single();
  createdClinicIds.push(clinicA.id);

  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminB.id);
  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB.from("clinics").insert({ name: "VerifyConv Clinic B", created_by: adminB.id }).select("id").single();
  createdClinicIds.push(clinicB.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  createdStaffUserIds.push(staffA.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);

  const { data: patientA } = await clientStaffA.from("patients").insert({ clinic_id: clinicA.id, name: "VerifyConv Patient", whatsapp_number: "910000000044" }).select("id").single();

  const { data: ownConv, error: ownConvErr } = await clientStaffA
    .from("conversations")
    .insert({ clinic_id: clinicA.id, patient_id: patientA.id })
    .select("id")
    .single();
  report("Clinic A staff can create a conversation for their own clinic's patient", !ownConvErr && !!ownConv, ownConvErr?.message);

  const { error: spoofErr } = await clientStaffA
    .from("conversations")
    .insert({ clinic_id: clinicB.id, patient_id: patientA.id });
  report("Clinic A staff cannot create a conversation tagged to another clinic", !!spoofErr, spoofErr?.message);

  console.log("\nCleaning up...");
  if (ownConv) await admin.from("conversations").delete().eq("id", ownConv.id);
  await cleanup();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error("Verification script error:", err.message);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
