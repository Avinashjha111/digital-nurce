// RLS verification for the template-media storage bucket: agency-admin
// owner only, cross-agency denied, clinic staff denied (template
// management itself is agency-only), anonymous denied.

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
  const email = `verifytplmedia-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role, full_name: `VerifyTplMedia ${tag}`, ...(clinicId ? { clinic_id: clinicId } : {}) },
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
  for (const path of uploadedPaths) await admin.storage.from("template-media").remove([path]);
  for (const id of createdStaffUserIds) await admin.auth.admin.deleteUser(id);
  for (const id of createdClinicIds) await admin.from("clinics").delete().eq("id", id);
  for (const id of createdOwnerUserIds) await admin.auth.admin.deleteUser(id);
}

const FAKE_FILE = new Blob(["fake image bytes for rls test"], { type: "image/png" });

async function main() {
  const adminA = await createTestUser("agency_admin", "agency-a");
  const adminB = await createTestUser("agency_admin", "agency-b");
  createdOwnerUserIds.push(adminA.id, adminB.id);
  await new Promise((r) => setTimeout(r, 300));

  const clientA = await signIn(adminA.email, adminA.password);
  const { data: clinicA } = await clientA.from("clinics").insert({ name: "VerifyTplMedia Clinic A", created_by: adminA.id }).select("id").single();
  createdClinicIds.push(clinicA.id);

  const clientB = await signIn(adminB.email, adminB.password);
  const { data: clinicB } = await clientB.from("clinics").insert({ name: "VerifyTplMedia Clinic B", created_by: adminB.id }).select("id").single();
  createdClinicIds.push(clinicB.id);

  const staffA = await createTestUser("clinic_admin", "staff-a", clinicA.id);
  createdStaffUserIds.push(staffA.id);
  await new Promise((r) => setTimeout(r, 300));
  const clientStaffA = await signIn(staffA.email, staffA.password);

  const pathA = `${clinicA.id}/${randomBytes(6).toString("hex")}.png`;
  const { error: uploadErr } = await clientA.storage.from("template-media").upload(pathA, FAKE_FILE, { contentType: "image/png" });
  report("Agency A can upload template media for their own clinic", !uploadErr, uploadErr?.message);
  if (!uploadErr) uploadedPaths.push(pathA);

  const { error: staffUploadErr } = await clientStaffA.storage.from("template-media").upload(`${clinicA.id}/staff-attempt.png`, FAKE_FILE, { contentType: "image/png" });
  report("Clinic staff cannot upload template media (agency-only)", !!staffUploadErr, staffUploadErr?.message);

  const { error: crossUploadErr } = await clientB.storage.from("template-media").upload(`${clinicA.id}/cross-agency.png`, FAKE_FILE, { contentType: "image/png" });
  report("Agency B cannot upload into Clinic A's template media folder", !!crossUploadErr, crossUploadErr?.message);

  const { error: ownerADownloadErr } = await clientA.storage.from("template-media").download(pathA);
  report("Agency A can download their own uploaded template media", !ownerADownloadErr, ownerADownloadErr?.message);

  const { error: ownerBDownloadErr } = await clientB.storage.from("template-media").download(pathA);
  report("Agency B cannot download Clinic A's template media", !!ownerBDownloadErr, ownerBDownloadErr?.message);

  const anon = anonClient();
  const { error: anonDownloadErr } = await anon.storage.from("template-media").download(pathA);
  report("Unauthenticated user cannot download template media", !!anonDownloadErr, anonDownloadErr?.message);

  console.log("\nCleaning up...");
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
