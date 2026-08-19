// One-off, server-only verification script for Milestone 5 RLS:
// prescriptions table AND storage.objects policies on the 'prescriptions'
// bucket. Storage checks matter as much as table checks here -- a clinic
// must not be able to read/upload into another clinic's folder.

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
  const email = `verify5-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `Verify5 ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
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
const uploadedPaths = [];

async function cleanup() {
  for (const path of uploadedPaths) {
    await admin.storage.from("prescriptions").remove([path]);
  }
  for (const id of createdStaffUserIds) await admin.auth.admin.deleteUser(id);
  for (const id of createdClinicIds) await admin.from("clinics").delete().eq("id", id);
  for (const id of createdOwnerUserIds) await admin.auth.admin.deleteUser(id);
}

const FAKE_FILE = new Blob(["not a real prescription, just test bytes"], {
  type: "image/png",
});

async function main() {
  console.log("Setting up: two clinics, staff for each, a patient + doctor in Clinic A...");
  const adminA = await createTestUser("agency_admin", "agency-a");
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminA.id, adminB.id);
  await new Promise((r) => setTimeout(r, 300));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA
    .from("clinics")
    .insert({ name: "Verify5 Clinic A", created_by: adminA.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicA.id);

  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB
    .from("clinics")
    .insert({ name: "Verify5 Clinic B", created_by: adminB.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicB.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  const staffB = await createTestUser("clinic_admin", "staff-b", clinicB.id);
  createdStaffUserIds.push(staffA.id, staffB.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);
  const clientStaffB = await signIn(staffB.email, staffB.password);

  const { data: patientA, error: patientAErr } = await clientStaffA
    .from("patients")
    .insert({ clinic_id: clinicA.id, name: "Verify5 Patient", whatsapp_number: "910000000077" })
    .select("id")
    .single();
  if (patientAErr || !patientA) throw new Error(`insert patientA: ${patientAErr?.message}`);

  const { data: doctorA, error: doctorAErr } = await clientA
    .from("doctors")
    .insert({ clinic_id: clinicA.id, name: "Dr Verify5" })
    .select("id")
    .single();
  if (doctorAErr || !doctorA) throw new Error(`insert doctorA: ${doctorAErr?.message}`);

  // --- Storage: Clinic A staff uploads into its own folder ---
  const pathA = `${clinicA.id}/${patientA.id}/${randomBytes(6).toString("hex")}.png`;
  const { error: uploadErr } = await clientStaffA.storage
    .from("prescriptions")
    .upload(pathA, FAKE_FILE, { contentType: "image/png" });
  report("Clinic A staff can upload into own clinic's storage folder", !uploadErr, uploadErr?.message);
  if (!uploadErr) uploadedPaths.push(pathA);

  // Clinic B staff cannot upload into Clinic A's folder.
  const spoofPath = `${clinicA.id}/${patientA.id}/spoofed.png`;
  const { error: spoofUploadErr } = await clientStaffB.storage
    .from("prescriptions")
    .upload(spoofPath, FAKE_FILE, { contentType: "image/png" });
  report("Clinic B staff cannot upload into Clinic A's storage folder", !!spoofUploadErr, spoofUploadErr?.message);

  // Clinic B staff cannot read/download Clinic A's file.
  const { error: staffBDownloadErr } = await clientStaffB.storage
    .from("prescriptions")
    .download(pathA);
  report("Clinic B staff cannot download Clinic A's prescription file", !!staffBDownloadErr, staffBDownloadErr?.message);

  // Agency A (owns Clinic A) CAN read the file.
  const { error: ownerADownloadErr } = await clientA.storage.from("prescriptions").download(pathA);
  report("Agency admin A (owns Clinic A) can download Clinic A's file", !ownerADownloadErr, ownerADownloadErr?.message);

  // Agency B (does not own Clinic A) cannot read the file.
  const { error: ownerBDownloadErr } = await clientB.storage.from("prescriptions").download(pathA);
  report("Agency admin B (does not own Clinic A) cannot download Clinic A's file", !!ownerBDownloadErr, ownerBDownloadErr?.message);

  // Anonymous cannot read or upload.
  const anon = anonClient();
  const { error: anonDownloadErr } = await anon.storage.from("prescriptions").download(pathA);
  report("Unauthenticated user cannot download a prescription file", !!anonDownloadErr, anonDownloadErr?.message);

  const { error: anonUploadErr } = await anon.storage
    .from("prescriptions")
    .upload(`${clinicA.id}/${patientA.id}/anon.png`, FAKE_FILE, { contentType: "image/png" });
  report("Unauthenticated user cannot upload a prescription file", !!anonUploadErr, anonUploadErr?.message);

  // --- prescriptions table ---
  const { data: prescriptionA, error: prescInsertErr } = await clientStaffA
    .from("prescriptions")
    .insert({
      clinic_id: clinicA.id,
      patient_id: patientA.id,
      doctor_id: doctorA.id,
      file_path: pathA,
      file_type: "image/png",
      uploaded_by: staffA.id,
    })
    .select("id")
    .single();
  report("Clinic A staff can create a prescription record", !prescInsertErr && !!prescriptionA, prescInsertErr?.message);

  const { data: staffBReadsPresc } = await clientStaffB
    .from("prescriptions")
    .select("id")
    .eq("id", prescriptionA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Clinic B staff cannot read Clinic A's prescription record",
    Array.isArray(staffBReadsPresc) && staffBReadsPresc.length === 0,
    `rows=${staffBReadsPresc?.length}`
  );

  const { data: ownerAReadsPresc } = await clientA
    .from("prescriptions")
    .select("id")
    .eq("id", prescriptionA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin A (owns Clinic A) can read Clinic A's prescription record",
    Array.isArray(ownerAReadsPresc) && ownerAReadsPresc.length === 1,
    `rows=${ownerAReadsPresc?.length}`
  );

  const { data: ownerBReadsPresc } = await clientB
    .from("prescriptions")
    .select("id")
    .eq("id", prescriptionA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency admin B (does not own Clinic A) cannot read Clinic A's prescription record",
    Array.isArray(ownerBReadsPresc) && ownerBReadsPresc.length === 0,
    `rows=${ownerBReadsPresc?.length}`
  );

  const { data: anonReadsPresc } = await anon.from("prescriptions").select("id");
  report(
    "Unauthenticated user cannot read any prescription records",
    Array.isArray(anonReadsPresc) && anonReadsPresc.length === 0,
    `rows=${anonReadsPresc?.length}`
  );

  console.log("\nCleaning up test users, clinics, and uploaded files...");
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
