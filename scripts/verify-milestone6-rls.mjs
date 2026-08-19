// One-off, server-only verification script for Milestone 6 RLS:
// prescription_medicines table ownership/denial.

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
  const email = `verify6-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `Verify6 ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
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
  console.log("Setting up: two clinics, staff, a patient/doctor/prescription in Clinic A...");
  const adminA = await createTestUser("agency_admin", "agency-a");
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminA.id, adminB.id);
  await new Promise((r) => setTimeout(r, 300));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA
    .from("clinics")
    .insert({ name: "Verify6 Clinic A", created_by: adminA.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicA.id);

  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB
    .from("clinics")
    .insert({ name: "Verify6 Clinic B", created_by: adminB.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicB.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  const staffB = await createTestUser("clinic_admin", "staff-b", clinicB.id);
  createdStaffUserIds.push(staffA.id, staffB.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);
  const clientStaffB = await signIn(staffB.email, staffB.password);

  const { data: patientA } = await clientStaffA
    .from("patients")
    .insert({ clinic_id: clinicA.id, name: "Verify6 Patient", whatsapp_number: "910000000066" })
    .select("id")
    .single();
  const { data: doctorA } = await clientA
    .from("doctors")
    .insert({ clinic_id: clinicA.id, name: "Dr Verify6" })
    .select("id")
    .single();
  const { data: prescriptionA } = await clientStaffA
    .from("prescriptions")
    .insert({
      clinic_id: clinicA.id,
      patient_id: patientA.id,
      doctor_id: doctorA.id,
      file_path: `${clinicA.id}/${patientA.id}/fake.png`,
      file_type: "image/png",
      uploaded_by: staffA.id,
    })
    .select("id")
    .single();

  // --- prescription_medicines ---
  const { data: medicine, error: medInsertErr } = await clientStaffA
    .from("prescription_medicines")
    .insert({
      prescription_id: prescriptionA.id,
      clinic_id: clinicA.id,
      name: "Verify6 Medicine",
      dosage: "1 tablet",
      needs_review: false,
    })
    .select("id")
    .single();
  report("Clinic A staff can insert a medicine row for their own prescription", !medInsertErr && !!medicine, medInsertErr?.message);

  const { data: staffBReadsMed } = await clientStaffB
    .from("prescription_medicines")
    .select("id")
    .eq("id", medicine?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Clinic B staff cannot read Clinic A's medicine row",
    Array.isArray(staffBReadsMed) && staffBReadsMed.length === 0,
    `rows=${staffBReadsMed?.length}`
  );

  const { error: staffBSpoofErr } = await clientStaffB.from("prescription_medicines").insert({
    prescription_id: prescriptionA.id,
    clinic_id: clinicA.id,
    name: "Spoofed Medicine",
    needs_review: false,
  });
  report("Clinic B staff cannot insert a medicine row into Clinic A's prescription", !!staffBSpoofErr, staffBSpoofErr?.message);

  // Regression check for the missing-UPDATE-policy bug found by the
  // Milestone 6 e2e test: Clinic B staff must not be able to flip
  // Clinic A's prescription status (e.g. force it to "approved").
  const { data: staffBUpdateRows } = await clientStaffB
    .from("prescriptions")
    .update({ status: "approved" })
    .eq("id", prescriptionA.id)
    .select("id");
  report(
    "Clinic B staff cannot update Clinic A's prescription status",
    (staffBUpdateRows?.length ?? 0) === 0,
    `rows_affected=${staffBUpdateRows?.length}`
  );

  const { data: staffAUpdateRows, error: staffAUpdateErr } = await clientStaffA
    .from("prescriptions")
    .update({ status: "review_required" })
    .eq("id", prescriptionA.id)
    .select("id");
  report(
    "Clinic A staff CAN update their own clinic's prescription status",
    !staffAUpdateErr && (staffAUpdateRows?.length ?? 0) === 1,
    staffAUpdateErr?.message ?? `rows_affected=${staffAUpdateRows?.length}`
  );

  const { data: ownerAReadsMed } = await clientA
    .from("prescription_medicines")
    .select("id")
    .eq("id", medicine?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin A (owns Clinic A) can read Clinic A's medicine row",
    Array.isArray(ownerAReadsMed) && ownerAReadsMed.length === 1,
    `rows=${ownerAReadsMed?.length}`
  );

  const { data: ownerBReadsMed } = await clientB
    .from("prescription_medicines")
    .select("id")
    .eq("id", medicine?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin B (does not own Clinic A) cannot read Clinic A's medicine row",
    Array.isArray(ownerBReadsMed) && ownerBReadsMed.length === 0,
    `rows=${ownerBReadsMed?.length}`
  );

  const anon = anonClient();
  const { data: anonReadsMed } = await anon.from("prescription_medicines").select("id");
  report(
    "Unauthenticated user cannot read any medicine rows",
    Array.isArray(anonReadsMed) && anonReadsMed.length === 0,
    `rows=${anonReadsMed?.length}`
  );

  console.log("\nCleaning up test users, clinics, and records...");
  if (prescriptionA) await admin.from("prescriptions").delete().eq("id", prescriptionA.id);
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
