// Creates two disposable users (one agency_admin, one clinic_admin) for a
// manual browser walkthrough of login + role-based redirect + clinic
// creation. Prints their credentials (test-only, random, throwaway) so the
// operator can drive the browser. Delete afterwards with
// scripts/delete-browser-test-users.mjs.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
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

function randomPassword() {
  return randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "") + "!Aa1";
}

async function createUser(role, tag) {
  const email = `browsertest-${tag}-${Date.now()}@example.test`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: `Browser Test ${tag}` },
  });
  if (error) throw new Error(error.message);
  return { id: data.user.id, email, password, role };
}

const agencyUser = await createUser("agency_admin", "agency");
const clinicUser = await createUser("clinic_admin", "clinic");

const out = { agencyUser, clinicUser };
writeFileSync(
  new URL("../.browser-test-users.json", import.meta.url),
  JSON.stringify(out, null, 2)
);
console.log("Created. Credentials written to .browser-test-users.json (gitignored).");
console.log("agency_admin:", agencyUser.email);
console.log("clinic_admin:", clinicUser.email);
