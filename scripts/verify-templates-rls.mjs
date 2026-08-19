// RLS verification for whatsapp_templates: same clinic-ownership pattern as
// prescriptions/conversations. Uses fabricated meta_template_id values
// (no real Meta calls) since this only tests database-layer authorization.

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
  const email = `verifytpl-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `VerifyTpl ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
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
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminA.id, adminB.id);
  await new Promise((r) => setTimeout(r, 300));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA
    .from("clinics")
    .insert({ name: "VerifyTpl Clinic A", created_by: adminA.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicA.id);

  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB
    .from("clinics")
    .insert({ name: "VerifyTpl Clinic B", created_by: adminB.id })
    .select("id")
    .single();
  createdClinicIds.push(clinicB.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  createdStaffUserIds.push(staffA.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);

  const { data: template, error: insertErr } = await clientA
    .from("whatsapp_templates")
    .insert({
      clinic_id: clinicA.id,
      name: "verify_template",
      category: "utility",
      language: "en_US",
      body_text: "Hi {{1}}, this is a test.",
      meta_template_id: "fake_meta_id_123",
      status: "pending",
      created_by: adminA.id,
    })
    .select("id")
    .single();
  report("Agency A can create a template for their own clinic", !insertErr && !!template, insertErr?.message);

  const { error: staffAInsertErr } = await clientStaffA.from("whatsapp_templates").insert({
    clinic_id: clinicA.id,
    name: "staff_attempt",
    category: "utility",
    language: "en_US",
    body_text: "test",
    status: "pending",
    created_by: staffA.id,
  });
  report(
    "Clinic staff CANNOT create a template (agency-only action)",
    !!staffAInsertErr,
    staffAInsertErr?.message
  );

  const { data: staffAReadsOwn } = await clientStaffA
    .from("whatsapp_templates")
    .select("id")
    .eq("id", template?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Clinic A staff CAN read their own clinic's template",
    Array.isArray(staffAReadsOwn) && staffAReadsOwn.length === 1,
    `rows=${staffAReadsOwn?.length}`
  );

  const { data: ownerBReads } = await clientB
    .from("whatsapp_templates")
    .select("id")
    .eq("id", template?.id ?? "00000000-0000-0000-0000-000000000000");
  report(
    "Agency B (does not own Clinic A) cannot read Clinic A's template",
    Array.isArray(ownerBReads) && ownerBReads.length === 0,
    `rows=${ownerBReads?.length}`
  );

  const { data: ownerBUpdateRows } = await clientB
    .from("whatsapp_templates")
    .update({ status: "approved" })
    .eq("id", template?.id ?? "00000000-0000-0000-0000-000000000000")
    .select("id");
  report(
    "Agency B cannot update Clinic A's template status",
    (ownerBUpdateRows?.length ?? 0) === 0,
    `rows_affected=${ownerBUpdateRows?.length}`
  );

  const anon = anonClient();
  const { data: anonReads } = await anon.from("whatsapp_templates").select("id");
  report(
    "Unauthenticated user cannot read any templates",
    Array.isArray(anonReads) && anonReads.length === 0,
    `rows=${anonReads?.length}`
  );

  console.log("\nCleaning up...");
  if (template) await admin.from("whatsapp_templates").delete().eq("id", template.id);
  await cleanup();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("FAILED CHECKS:");
    for (const f of failed) console.log(` - ${f.name}`);
    process.exitCode = 1;
  }
}

main().catch(async (err) => {
  console.error("Verification script error:", err.message);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
