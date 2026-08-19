// One-off, server-only verification script for Milestone 3 (patients) RLS.
// Run with: node scripts/verify-milestone3-rls.mjs
//
// Same discipline as verify-milestone2-rls.mjs: the secret key is only used
// to create/delete disposable users and clinics. All read/write checks go
// through normal signed-in sessions via the publishable key.

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

if (!URL_ || !PUBLISHABLE_KEY || !SECRET_KEY) {
  console.error("Missing required env vars in .env.local. Aborting.");
  process.exit(1);
}

const admin = createClient(URL_, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function anonClient() {
  return createClient(URL_, PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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
  const email = `verify3-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: `Verify3 ${tag}`,
      ...(clinicId ? { clinic_id: clinicId } : {}),
    },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user (${tag}): ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

async function signIn(email, password) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  }
  return client;
}

// FK order matters: clinic staff.clinic_id -> clinics.id (RESTRICT) and
// clinics.created_by -> users.id (RESTRICT), so deletion must go
// staff users -> clinics (cascades patients) -> agency admin users.
const createdStaffUserIds = [];
const createdOwnerUserIds = [];
const createdClinicIds = [];

async function cleanup() {
  for (const id of createdStaffUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
  for (const id of createdClinicIds) {
    await admin.from("clinics").delete().eq("id", id);
  }
  for (const id of createdOwnerUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

async function main() {
  console.log("Creating agency admins + clinics...");
  const adminA = await createTestUser("agency_admin", "agency-a");
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminA.id, adminB.id);
  await new Promise((r) => setTimeout(r, 400));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA
    .from("clinics")
    .insert({ name: "Verify3 Clinic A", created_by: adminA.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicA.id);

  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB
    .from("clinics")
    .insert({ name: "Verify3 Clinic B", created_by: adminB.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicB.id);

  console.log("Creating clinic staff assigned to each clinic...");
  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  const staffB = await createTestUser("clinic_admin", "staff-b", clinicB.id);
  createdStaffUserIds.push(staffA.id, staffB.id);
  await new Promise((r) => setTimeout(r, 400));

  const clientStaffA = await signIn(staffA.email, staffA.password);
  const clientStaffB = await signIn(staffB.email, staffB.password);

  // 1. Clinic staff A can add a patient to their own clinic.
  const { data: patientA, error: insertErr } = await clientStaffA
    .from("patients")
    .insert({ clinic_id: clinicA.id, name: "Verify Patient A", whatsapp_number: "+910000000001" })
    .select("id, name")
    .single();
  report("Clinic staff A can add a patient to their own clinic", !insertErr && !!patientA, insertErr?.message);

  // 2. Clinic staff A sees exactly their own clinic's patient(s).
  const { data: staffASees } = await clientStaffA.from("patients").select("id");
  report(
    "Clinic staff A sees exactly their own clinic's patient(s)",
    Array.isArray(staffASees) && staffASees.length === 1 && staffASees[0].id === patientA?.id,
    `count=${staffASees?.length}`
  );

  // 3. Clinic staff A cannot spoof clinic_id to insert into Clinic B.
  const { error: spoofErr } = await clientStaffA
    .from("patients")
    .insert({ clinic_id: clinicB.id, name: "Spoofed Patient", whatsapp_number: "+910000000002" });
  report("Clinic staff A cannot insert a patient into another clinic", !!spoofErr, spoofErr?.message);

  // 4. Clinic staff B cannot read Clinic A's patient.
  const { data: staffBReadsA } = await clientStaffB
    .from("patients")
    .select("id")
    .eq("id", patientA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Clinic staff B cannot read Clinic A's patient",
    Array.isArray(staffBReadsA) && staffBReadsA.length === 0,
    `rows=${staffBReadsA?.length}`
  );

  // 5. Agency admin A (owns Clinic A) can see Clinic A's patient.
  const { data: adminASeesPatient } = await clientA
    .from("patients")
    .select("id")
    .eq("id", patientA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin A (owns Clinic A) can read Clinic A's patient",
    Array.isArray(adminASeesPatient) && adminASeesPatient.length === 1,
    `rows=${adminASeesPatient?.length}`
  );

  // 6. Agency admin B (does not own Clinic A) cannot see Clinic A's patient.
  const { data: adminBReadsPatient } = await clientB
    .from("patients")
    .select("id")
    .eq("id", patientA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin B (does not own Clinic A) cannot read Clinic A's patient",
    Array.isArray(adminBReadsPatient) && adminBReadsPatient.length === 0,
    `rows=${adminBReadsPatient?.length}`
  );

  // 7. Unauthenticated cannot read or insert patients.
  const anon = anonClient();
  const { data: anonReads } = await anon.from("patients").select("id");
  report(
    "Unauthenticated user cannot read any patients",
    Array.isArray(anonReads) && anonReads.length === 0,
    `rows=${anonReads?.length}`
  );

  const { error: anonInsertErr } = await anon
    .from("patients")
    .insert({ clinic_id: clinicA.id, name: "Anon Patient", whatsapp_number: "+910000000003" });
  report("Unauthenticated user cannot create a patient", !!anonInsertErr, anonInsertErr?.message);

  console.log("\nCleaning up test users and clinics...");
  await cleanup();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("FAILED CHECKS:");
    for (const f of failed) console.log(` - ${f.name}`);
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("Verification script error:", err.message);
  await cleanup().catch(() => {});
  process.exit(1);
});
