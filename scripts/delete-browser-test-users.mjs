// Deletes the disposable users created by create-browser-test-users.mjs
// and removes the local credentials file.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, unlinkSync } from "node:fs";

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

const fileUrl = new URL("../.browser-test-users.json", import.meta.url);
if (!existsSync(fileUrl)) {
  console.log("No .browser-test-users.json found, nothing to delete.");
  process.exit(0);
}

const { agencyUser, clinicUser } = JSON.parse(readFileSync(fileUrl, "utf8"));

// Clinics reference users.id with no ON DELETE CASCADE, so remove them
// before deleting the user that created them.
await admin.from("clinics").delete().eq("created_by", agencyUser.id);

for (const u of [agencyUser, clinicUser]) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  console.log(`${error ? "FAILED" : "deleted"}: ${u.email}`);
}

unlinkSync(fileUrl);
console.log("Cleanup complete.");
