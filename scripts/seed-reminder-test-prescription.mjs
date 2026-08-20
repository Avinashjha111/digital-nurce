// One-off: seeds a review_required prescription + medicine with an
// explicit near-future timing, so the Milestone 8 reminder scheduler can
// be tested end-to-end for real (approve via the real UI -> reminder row
// created -> cron endpoint claims + sends it) without waiting on Gemini.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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

const timing = process.argv[2];
if (!timing || !/^\d{2}:\d{2}$/.test(timing)) {
  console.error("Usage: node scripts/seed-reminder-test-prescription.mjs HH:MM");
  process.exit(1);
}

const CLINIC_ID = "68662eec-b6b4-4559-acd6-d3705e008b7e";
const PATIENT_ID = "bc0693cd-ae38-44f0-87e1-a269a21b2385";
const DOCTOR_ID = "232fd7a4-46a7-4a96-83d0-3dce27cc1786";
const UPLOADER_ID = "9526fc53-ef90-47c4-9a12-42fe15d9b04b";
const FILE_PATH =
  "68662eec-b6b4-4559-acd6-d3705e008b7e/bc0693cd-ae38-44f0-87e1-a269a21b2385/c073546ec88b.png";

const { data: prescription, error: pErr } = await admin
  .from("prescriptions")
  .insert({
    clinic_id: CLINIC_ID,
    patient_id: PATIENT_ID,
    doctor_id: DOCTOR_ID,
    file_path: FILE_PATH,
    file_type: "image/png",
    status: "review_required",
    uploaded_by: UPLOADER_ID,
    extracted_patient_name: "Abhishek Kumar",
    patient_name_needs_review: false,
    follow_up_required: false,
    follow_up_needs_review: false,
  })
  .select("id")
  .single();

if (pErr || !prescription) {
  console.error("Failed to insert prescription:", pErr);
  process.exit(1);
}

const { error: mErr } = await admin.from("prescription_medicines").insert({
  prescription_id: prescription.id,
  clinic_id: CLINIC_ID,
  name: "Vitamin D3 60K",
  dosage: "1 sachet",
  frequency: "once daily",
  duration_days: 1,
  timings: [timing],
  instruction: "After breakfast",
  needs_review: false,
});

if (mErr) {
  console.error("Failed to insert medicine:", mErr);
  process.exit(1);
}

console.log("Seeded review_required prescription:", prescription.id);
console.log("Open: http://localhost:3000/clinic/prescriptions/" + prescription.id);
