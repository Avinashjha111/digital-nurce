// One-off, server-only verification script for Milestone 2 RLS.
// Run with: node scripts/verify-milestone2-rls.mjs
//
// Uses the Supabase secret key (admin API) ONLY to create/delete disposable
// test users and to clean up test data. All RLS checks are performed using
// normal signed-in user sessions obtained via the publishable key, exactly
// like the real app does -- the secret key is never used to read/write
// clinic data directly, so it never masks an RLS bug.
//
// Never logs passwords or API keys.

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

async function createTestUser(role, tag) {
  const email = `verify-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `Verify ${tag}` },
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

const createdUserIds = [];
const createdClinicIds = [];

async function cleanup() {
  for (const id of createdClinicIds) {
    await admin.from("clinics").delete().eq("id", id);
  }
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

async function main() {
  console.log("Creating disposable test users via admin API (server-only, secret key)...");
  const adminA = await createTestUser("agency_admin", "agency-a");
  const adminB = await createTestUser("agency_admin", "agency-b");
  const clinicStaff = await createTestUser("clinic_admin", "clinic-staff");
  createdUserIds.push(adminA.id, adminB.id, clinicStaff.id);

  // Give the handle_new_user trigger a beat (it runs in the same transaction,
  // but the REST layer's PostgREST schema cache can lag by a moment).
  await new Promise((r) => setTimeout(r, 500));

  console.log("Signing in as Agency Admin A (via publishable key, normal session)...");
  const clientA = await signIn(adminA.email, adminA.password);

  // 1. Agency A creates its own clinic through a normal RLS-bound session.
  const { data: clinicA, error: insertAErr } = await clientA
    .from("clinics")
    .insert({ name: "Verify Clinic A", city: "Pune", created_by: adminA.id })
    .select("id, name")
    .single();
  report(
    "Agency A can create its own clinic",
    !insertAErr && !!clinicA,
    insertAErr?.message
  );
  if (clinicA) createdClinicIds.push(clinicA.id);

  // 1b. Agency A adds a doctor under its own clinic.
  const { data: doctorA, error: doctorInsertErr } = await clientA
    .from("doctors")
    .insert({ clinic_id: clinicA?.id, name: "Dr. Verify A" })
    .select("id, name")
    .single();
  report(
    "Agency A can add a doctor to its own clinic",
    !doctorInsertErr && !!doctorA,
    doctorInsertErr?.message
  );

  // 2. Agency A can read its own clinic (and only its own).
  const { data: aSeesOwn, error: selectAErr } = await clientA
    .from("clinics")
    .select("id");
  report(
    "Agency A sees exactly its own clinic(s)",
    !selectAErr && Array.isArray(aSeesOwn) && aSeesOwn.length === 1 && aSeesOwn[0].id === clinicA?.id,
    `count=${aSeesOwn?.length}`
  );

  console.log("Signing in as Agency Admin B...");
  const clientB = await signIn(adminB.email, adminB.password);

  const { data: clinicB, error: insertBErr } = await clientB
    .from("clinics")
    .insert({ name: "Verify Clinic B", city: "Delhi", created_by: adminB.id })
    .select("id, name")
    .single();
  report(
    "Agency B can create its own clinic",
    !insertBErr && !!clinicB,
    insertBErr?.message
  );
  if (clinicB) createdClinicIds.push(clinicB.id);

  // 3. Agency B cannot READ Agency A's clinic.
  const { data: bReadsA } = await clientB
    .from("clinics")
    .select("id")
    .eq("id", clinicA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency B cannot read Agency A's clinic",
    Array.isArray(bReadsA) && bReadsA.length === 0,
    `rows=${bReadsA?.length}`
  );

  // 4. Agency B cannot UPDATE Agency A's clinic.
  const { data: bUpdatesA } = await clientB
    .from("clinics")
    .update({ name: "Hijacked" })
    .eq("id", clinicA?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Agency B cannot update Agency A's clinic",
    Array.isArray(bUpdatesA) && bUpdatesA.length === 0,
    `rows_affected=${bUpdatesA?.length}`
  );

  // 5. Agency B cannot DELETE Agency A's clinic.
  const { data: bDeletesA } = await clientB
    .from("clinics")
    .delete()
    .eq("id", clinicA?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Agency B cannot delete Agency A's clinic",
    Array.isArray(bDeletesA) && bDeletesA.length === 0,
    `rows_affected=${bDeletesA?.length}`
  );

  // 5b. Agency B cannot read/update/delete Agency A's doctor.
  const { data: bReadsDoctorA } = await clientB
    .from("doctors")
    .select("id")
    .eq("id", doctorA?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency B cannot read Agency A's doctor",
    Array.isArray(bReadsDoctorA) && bReadsDoctorA.length === 0,
    `rows=${bReadsDoctorA?.length}`
  );

  const { data: bUpdatesDoctorA } = await clientB
    .from("doctors")
    .update({ name: "Hijacked Doctor" })
    .eq("id", doctorA?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Agency B cannot update Agency A's doctor",
    Array.isArray(bUpdatesDoctorA) && bUpdatesDoctorA.length === 0,
    `rows_affected=${bUpdatesDoctorA?.length}`
  );

  const { data: bDeletesDoctorA } = await clientB
    .from("doctors")
    .delete()
    .eq("id", doctorA?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Agency B cannot delete Agency A's doctor",
    Array.isArray(bDeletesDoctorA) && bDeletesDoctorA.length === 0,
    `rows_affected=${bDeletesDoctorA?.length}`
  );

  // 6. Confirm Clinic A is untouched after B's attempts (belt and suspenders).
  const { data: aStillIntact } = await clientA
    .from("clinics")
    .select("id, name")
    .eq("id", clinicA?.id ?? "00000000-0000-0000-0000-000000000000")
    .single();
  report(
    "Clinic A name is unchanged after Agency B's attack attempts",
    aStillIntact?.name === "Verify Clinic A",
    `name=${aStillIntact?.name}`
  );

  // 7. Anonymous (no session) cannot read any clinics.
  const anon = anonClient();
  const { data: anonReads } = await anon.from("clinics").select("id");
  report(
    "Unauthenticated user cannot read any clinics",
    Array.isArray(anonReads) && anonReads.length === 0,
    `rows=${anonReads?.length}`
  );

  // 8. Anonymous cannot insert a clinic.
  const { error: anonInsertErr } = await anon
    .from("clinics")
    .insert({ name: "Anon Clinic", created_by: adminA.id });
  report(
    "Unauthenticated user cannot create a clinic",
    !!anonInsertErr,
    anonInsertErr?.message
  );

  // 9. Anonymous cannot update/delete Agency A's clinic.
  const { data: anonUpdates } = await anon
    .from("clinics")
    .update({ name: "Anon Hijack" })
    .eq("id", clinicA?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Unauthenticated user cannot update a clinic",
    Array.isArray(anonUpdates) && anonUpdates.length === 0,
    `rows_affected=${anonUpdates?.length}`
  );

  // 9b. Anonymous cannot read doctors either.
  const { data: anonReadsDoctors } = await anon.from("doctors").select("id");
  report(
    "Unauthenticated user cannot read any doctors",
    Array.isArray(anonReadsDoctors) && anonReadsDoctors.length === 0,
    `rows=${anonReadsDoctors?.length}`
  );

  // 10. Sanity check the users table itself is tenant/self scoped too.
  const { data: bReadsAdminAProfile } = await clientB
    .from("users")
    .select("id")
    .eq("id", adminA.id);
  report(
    "Agency B cannot read Agency A's user profile row",
    Array.isArray(bReadsAdminAProfile) && bReadsAdminAProfile.length === 0,
    `rows=${bReadsAdminAProfile?.length}`
  );

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
