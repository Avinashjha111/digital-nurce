// One-off, server-only verification script for Milestone 4 RLS:
// whatsapp_credentials (must be default-deny for EVERYONE, including the
// clinic's own owner/staff), and conversations/messages ownership.

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
  const email = `verify4-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `Verify4 ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
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
  console.log("Setting up: agency admin, clinic, clinic staff, a patient + conversation...");
  const adminA = await createTestUser("agency_admin", "agency-a");
  createdOwnerUserIds.push(adminA.id);
  await new Promise((r) => setTimeout(r, 300));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA
    .from("clinics")
    .insert({ name: "Verify4 Clinic A", created_by: adminA.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicA.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  createdStaffUserIds.push(staffA.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);

  const { data: patientA, error: patientAErr } = await clientStaffA
    .from("patients")
    .insert({ clinic_id: clinicA.id, name: "Verify4 Patient", whatsapp_number: "910000000099" })
    .select("id")
    .single();
  if (patientAErr || !patientA) throw new Error(`insert patientA: ${patientAErr?.message}`);

  // Conversations are only ever created by the webhook receiver (admin
  // client, no user session) when a patient messages in for the first
  // time -- clinic staff reply into existing conversations but never
  // create new ones, so this mirrors real usage rather than testing a
  // capability the app doesn't use.
  const { data: conversationA, error: conversationAErr } = await admin
    .from("conversations")
    .insert({ clinic_id: clinicA.id, patient_id: patientA.id })
    .select("id")
    .single();
  if (conversationAErr || !conversationA) throw new Error(`insert conversationA: ${conversationAErr?.message}`);

  await clientStaffA.from("messages").insert({
    conversation_id: conversationA.id,
    clinic_id: clinicA.id,
    patient_id: patientA.id,
    direction: "outbound",
    body: "hello",
    status: "sent",
  });

  // --- whatsapp_credentials: must be default-deny for EVERYONE ---
  // Seed a credential row directly via admin (simulating a connected clinic).
  await admin.from("whatsapp_credentials").insert({
    clinic_id: clinicA.id,
    phone_number_id: "123456",
    access_token: "fake-token-for-rls-test",
  });

  const { data: ownerReadsCreds } = await clientA.from("whatsapp_credentials").select("*");
  report(
    "Clinic-owning agency admin CANNOT read whatsapp_credentials",
    Array.isArray(ownerReadsCreds) && ownerReadsCreds.length === 0,
    `rows=${ownerReadsCreds?.length}`
  );

  const { data: staffReadsCreds } = await clientStaffA.from("whatsapp_credentials").select("*");
  report(
    "Clinic staff CANNOT read whatsapp_credentials",
    Array.isArray(staffReadsCreds) && staffReadsCreds.length === 0,
    `rows=${staffReadsCreds?.length}`
  );

  const anon = anonClient();
  const { data: anonReadsCreds } = await anon.from("whatsapp_credentials").select("*");
  report(
    "Unauthenticated user CANNOT read whatsapp_credentials",
    Array.isArray(anonReadsCreds) && anonReadsCreds.length === 0,
    `rows=${anonReadsCreds?.length}`
  );

  // RLS with zero policies means the row is invisible to this role, so the
  // UPDATE matches 0 rows and returns no error (not a thrown exception) --
  // confirm via the admin client that the token is genuinely unchanged.
  const { data: staffWriteCredsRows, error: staffWriteCredsErr } = await clientStaffA
    .from("whatsapp_credentials")
    .update({ access_token: "hijacked" })
    .eq("clinic_id", clinicA.id)
    .select("clinic_id");
  const { data: credsAfterAttempt } = await admin
    .from("whatsapp_credentials")
    .select("access_token")
    .eq("clinic_id", clinicA.id)
    .single();
  report(
    "Clinic staff CANNOT overwrite whatsapp_credentials",
    (!!staffWriteCredsErr || (staffWriteCredsRows?.length ?? 0) === 0) &&
      credsAfterAttempt?.access_token === "fake-token-for-rls-test",
    `rows_affected=${staffWriteCredsRows?.length}, token_after=${credsAfterAttempt?.access_token}`
  );

  // --- conversations / messages ownership (second clinic, no relation) ---
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminB.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB
    .from("clinics")
    .insert({ name: "Verify4 Clinic B", created_by: adminB.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicB.id);
  const staffB = await createTestUser("clinic_admin", "staff-b", clinicB.id);
  createdStaffUserIds.push(staffB.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffB = await signIn(staffB.email, staffB.password);

  const { data: staffBReadsConvo } = await clientStaffB
    .from("conversations")
    .select("id")
    .eq("id", conversationA.id);
  report(
    "Clinic B staff cannot read Clinic A's conversation",
    Array.isArray(staffBReadsConvo) && staffBReadsConvo.length === 0,
    `rows=${staffBReadsConvo?.length}`
  );

  const { data: staffBReadsMsgs } = await clientStaffB
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationA.id);
  report(
    "Clinic B staff cannot read Clinic A's messages",
    Array.isArray(staffBReadsMsgs) && staffBReadsMsgs.length === 0,
    `rows=${staffBReadsMsgs?.length}`
  );

  const { error: staffBInsertErr } = await clientStaffB.from("messages").insert({
    conversation_id: conversationA.id,
    clinic_id: clinicA.id,
    patient_id: patientA.id,
    direction: "outbound",
    body: "spoofed",
    status: "sent",
  });
  report("Clinic B staff cannot insert a message into Clinic A's conversation", !!staffBInsertErr, staffBInsertErr?.message);

  const { data: ownerAReadsConvo } = await clientA
    .from("conversations")
    .select("id")
    .eq("id", conversationA.id);
  report(
    "Agency admin A (owns Clinic A) can read Clinic A's conversation",
    Array.isArray(ownerAReadsConvo) && ownerAReadsConvo.length === 1,
    `rows=${ownerAReadsConvo?.length}`
  );

  const { data: ownerBReadsConvo } = await clientB
    .from("conversations")
    .select("id")
    .eq("id", conversationA.id);
  report(
    "Agency admin B (does not own Clinic A) cannot read Clinic A's conversation",
    Array.isArray(ownerBReadsConvo) && ownerBReadsConvo.length === 0,
    `rows=${ownerBReadsConvo?.length}`
  );

  const { data: anonReadsConvo } = await anon.from("conversations").select("id");
  report(
    "Unauthenticated user cannot read any conversations",
    Array.isArray(anonReadsConvo) && anonReadsConvo.length === 0,
    `rows=${anonReadsConvo?.length}`
  );

  console.log("\nCleaning up test users, clinics, and credentials...");
  await admin.from("whatsapp_credentials").delete().eq("clinic_id", clinicA.id);
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
