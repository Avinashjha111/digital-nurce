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

const fileUrl = new URL("../.clinic-staff-test-user.json", import.meta.url);
if (!existsSync(fileUrl)) {
  console.log("No .clinic-staff-test-user.json found, nothing to delete.");
  process.exit(0);
}

const { id, email } = JSON.parse(readFileSync(fileUrl, "utf8"));
const { error } = await admin.auth.admin.deleteUser(id);
console.log(`${error ? "FAILED" : "deleted"}: ${email}`);
unlinkSync(fileUrl);
