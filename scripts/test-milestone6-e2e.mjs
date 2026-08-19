// Full pipeline test mirroring processPrescription() exactly, run through a
// real clinic-staff session (RLS-bound, not the admin client) end to end:
// upload real bytes to Storage -> create prescriptions row -> download it
// back -> call Gemini -> insert prescription_medicines -> update status.
// Only user creation/cleanup uses the admin client.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { z } from "zod";

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const admin = createClient(URL_, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const extractedPrescriptionSchema = z.object({
  patient_name: z.string().nullable(),
  patient_name_needs_review: z.boolean(),
  medicines: z.array(
    z.object({
      name: z.string(),
      dosage: z.string().nullable(),
      frequency: z.string().nullable(),
      duration_days: z.number().int().nullable(),
      timings: z.array(z.string()).nullable(),
      instruction: z.string().nullable(),
      needs_review: z.boolean(),
    })
  ),
  follow_up: z.object({
    required: z.boolean().nullable(),
    days_after: z.number().int().nullable(),
    instruction: z.string().nullable(),
    needs_review: z.boolean(),
  }),
});

async function extractWithGemini(fileBytes, mimeType) {
  const base64Data = Buffer.from(fileBytes).toString("base64");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "Extract prescription data. Never guess; null + needs_review=true if unclear." }],
        },
        contents: [
          {
            parts: [
              { text: "Extract patient name, medicines, and follow-up." },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              patient_name: { type: "string", nullable: true },
              patient_name_needs_review: { type: "boolean" },
              medicines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    dosage: { type: "string", nullable: true },
                    frequency: { type: "string", nullable: true },
                    duration_days: { type: "integer", nullable: true },
                    timings: { type: "array", items: { type: "string" }, nullable: true },
                    instruction: { type: "string", nullable: true },
                    needs_review: { type: "boolean" },
                  },
                  required: ["name", "dosage", "frequency", "duration_days", "timings", "instruction", "needs_review"],
                },
              },
              follow_up: {
                type: "object",
                properties: {
                  required: { type: "boolean", nullable: true },
                  days_after: { type: "integer", nullable: true },
                  instruction: { type: "string", nullable: true },
                  needs_review: { type: "boolean" },
                },
                required: ["required", "days_after", "instruction", "needs_review"],
              },
            },
            required: ["patient_name", "patient_name_needs_review", "medicines", "follow_up"],
          },
          temperature: 0,
        },
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}` };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, error: "no text" };
  const parsed = extractedPrescriptionSchema.safeParse(JSON.parse(text));
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  return { ok: true, data: parsed.data };
}

function randomPassword() {
  return randomBytes(18).toString("base64");
}

const results = [];
function report(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

const createdStaffUserIds = [];
const createdOwnerUserIds = [];
const createdClinicIds = [];
const uploadedPaths = [];

async function cleanup() {
  for (const path of uploadedPaths) await admin.storage.from("prescriptions").remove([path]);
  for (const id of createdStaffUserIds) await admin.auth.admin.deleteUser(id);
  for (const id of createdClinicIds) await admin.from("clinics").delete().eq("id", id);
  for (const id of createdOwnerUserIds) await admin.auth.admin.deleteUser(id);
}

async function main() {
  const ownerEmail = `verify6e2e-agency-${Date.now()}@example.test`;
  const ownerPassword = randomPassword();
  const { data: ownerUserData } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { role: "agency_admin", full_name: "Verify6E2E Owner" },
  });
  createdOwnerUserIds.push(ownerUserData.user.id);

  const anon1 = createClient(URL_, PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: ownerSession } = await anon1.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword });
  const clientOwner = anon1;

  const { data: clinic } = await clientOwner
    .from("clinics")
    .insert({ name: "Verify6E2E Clinic", created_by: ownerSession.user.id })
    .select("id")
    .single();
  createdClinicIds.push(clinic.id);

  const staffEmail = `verify6e2e-staff-${Date.now()}@example.test`;
  const staffPassword = randomPassword();
  const { data: staffUserData } = await admin.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
    user_metadata: { role: "clinic_admin", full_name: "Verify6E2E Staff", clinic_id: clinic.id },
  });
  createdStaffUserIds.push(staffUserData.user.id);
  await new Promise((r) => setTimeout(r, 400));

  const anon2 = createClient(URL_, PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  await anon2.auth.signInWithPassword({ email: staffEmail, password: staffPassword });
  const clientStaff = anon2;

  const { data: patient } = await clientStaff
    .from("patients")
    .insert({ clinic_id: clinic.id, name: "Verify6E2E Patient", whatsapp_number: "910000000055" })
    .select("id")
    .single();
  const { data: doctor } = await clientOwner
    .from("doctors")
    .insert({ clinic_id: clinic.id, name: "Dr Verify6E2E" })
    .select("id")
    .single();

  // 1. Upload real bytes via the clinic staff session (RLS-bound), exactly as the form does.
  const fileBytes = readFileSync(new URL("../.test-prescription.png", import.meta.url));
  const filePath = `${clinic.id}/${patient.id}/${randomBytes(6).toString("hex")}.png`;
  const { error: uploadErr } = await clientStaff.storage
    .from("prescriptions")
    .upload(filePath, fileBytes, { contentType: "image/png" });
  report("Upload real prescription bytes via clinic-staff session", !uploadErr, uploadErr?.message);
  if (!uploadErr) uploadedPaths.push(filePath);

  // 2. Create the prescriptions row via the clinic staff session.
  const { data: prescription, error: prescErr } = await clientStaff
    .from("prescriptions")
    .insert({
      clinic_id: clinic.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      file_path: filePath,
      file_type: "image/png",
      uploaded_by: staffUserData.user.id,
    })
    .select("id")
    .single();
  report("Create prescriptions row via clinic-staff session", !prescErr && !!prescription, prescErr?.message);

  // 3. Download it back (as processPrescription does) via the SAME session.
  const { data: downloaded, error: downloadErr } = await clientStaff.storage
    .from("prescriptions")
    .download(filePath);
  report("Download the uploaded file back via clinic-staff session", !downloadErr && !!downloaded, downloadErr?.message);

  // 4. Extract with Gemini.
  const arrayBuffer = await downloaded.arrayBuffer();
  const extraction = await extractWithGemini(new Uint8Array(arrayBuffer), "image/png");
  report("Gemini extraction succeeds and validates", extraction.ok, extraction.ok ? undefined : extraction.error);
  report(
    "Extracted patient name matches the real prescription image",
    extraction.ok && extraction.data.patient_name === "Priya Sharma",
    extraction.ok ? `got "${extraction.data.patient_name}"` : undefined
  );
  report(
    "Extracted exactly 2 medicines",
    extraction.ok && extraction.data.medicines.length === 2,
    extraction.ok ? `got ${extraction.data.medicines.length}` : undefined
  );

  // 5. Insert prescription_medicines + update prescriptions, via the same session.
  if (extraction.ok) {
    const { error: medErr } = await clientStaff.from("prescription_medicines").insert(
      extraction.data.medicines.map((m) => ({
        prescription_id: prescription.id,
        clinic_id: clinic.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration_days: m.duration_days,
        timings: m.timings,
        instruction: m.instruction,
        needs_review: m.needs_review,
      }))
    );
    report("Insert prescription_medicines via clinic-staff session", !medErr, medErr?.message);

    const { data: updatedRows, error: updateErr } = await clientStaff
      .from("prescriptions")
      .update({
        status: "review_required",
        extracted_patient_name: extraction.data.patient_name,
        patient_name_needs_review: extraction.data.patient_name_needs_review,
        follow_up_required: extraction.data.follow_up.required,
        follow_up_days_after: extraction.data.follow_up.days_after,
        follow_up_instruction: extraction.data.follow_up.instruction,
        follow_up_needs_review: extraction.data.follow_up.needs_review,
      })
      .eq("id", prescription.id)
      .select("id");
    // RLS silently matches 0 rows on a missing UPDATE policy -- no error,
    // just nothing changes -- so check rows affected, not just error==null.
    report(
      "Update prescriptions with extracted data via clinic-staff session",
      !updateErr && (updatedRows?.length ?? 0) === 1,
      updateErr?.message ?? `rows_affected=${updatedRows?.length}`
    );
  }

  // 6. Read it all back as the app would render it.
  const { data: finalPrescription } = await clientStaff
    .from("prescriptions")
    .select("*")
    .eq("id", prescription.id)
    .single();
  const { data: finalMedicines } = await clientStaff
    .from("prescription_medicines")
    .select("*")
    .eq("prescription_id", prescription.id);
  report(
    "Final prescription status is review_required with follow-up captured",
    finalPrescription?.status === "review_required" && finalPrescription?.follow_up_days_after === 7,
    `status=${finalPrescription?.status}, days_after=${finalPrescription?.follow_up_days_after}`
  );
  report(
    "Final medicine rows readable back with correct dosage",
    finalMedicines?.some((m) => m.name.includes("Amoxicillin") && m.dosage === "1 tablet"),
    JSON.stringify(finalMedicines?.map((m) => ({ name: m.name, dosage: m.dosage })))
  );

  console.log("\nCleaning up...");
  if (prescription) await admin.from("prescriptions").delete().eq("id", prescription.id);
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
  console.error("Test error:", err.message);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
