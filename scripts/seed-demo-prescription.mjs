// Uploads the synthetic test prescription to the REAL demo clinic/patient
// and runs it through the real extraction pipeline (mirrors
// processPrescription exactly), via a temporary clinic-staff session so RLS
// is respected the same way the real app enforces it. Leaves the resulting
// prescription + medicines in place as populated demo data; only the
// temporary staff login is deleted afterward.

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

const CLINIC_ID = "68662eec-b6b4-4559-acd6-d3705e008b7e"; // Hi tech Dental clinic
const PATIENT_ID = "bc0693cd-ae38-44f0-87e1-a269a21b2385"; // Rahul Kumar
const DOCTOR_ID = "232fd7a4-46a7-4a96-83d0-3dce27cc1786"; // Dr Sajid Akhtar

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
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = extractedPrescriptionSchema.parse(JSON.parse(text));
  return parsed;
}

const email = `browsertest-clinicstaff-${Date.now()}@example.test`;
const password = randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "") + "!Aa1";
const { data: userData, error: userErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "clinic_admin", full_name: "Demo Clinic Staff", clinic_id: CLINIC_ID },
});
if (userErr) throw new Error(userErr.message);
await new Promise((r) => setTimeout(r, 500));

const staffClient = createClient(URL_, PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
await staffClient.auth.signInWithPassword({ email, password });

const fileBytes = readFileSync(new URL("../.test-prescription.png", import.meta.url));
const filePath = `${CLINIC_ID}/${PATIENT_ID}/${randomBytes(6).toString("hex")}.png`;
const { error: uploadErr } = await staffClient.storage
  .from("prescriptions")
  .upload(filePath, fileBytes, { contentType: "image/png" });
if (uploadErr) throw new Error(`upload: ${uploadErr.message}`);

const { data: prescription, error: prescErr } = await staffClient
  .from("prescriptions")
  .insert({
    clinic_id: CLINIC_ID,
    patient_id: PATIENT_ID,
    doctor_id: DOCTOR_ID,
    file_path: filePath,
    file_type: "image/png",
    uploaded_by: userData.user.id,
  })
  .select("id")
  .single();
if (prescErr) throw new Error(`insert prescription: ${prescErr.message}`);

console.log("Prescription created:", prescription.id);
console.log("Extracting with Gemini...");

const extracted = await extractWithGemini(fileBytes, "image/png");

await staffClient.from("prescription_medicines").insert(
  extracted.medicines.map((m) => ({
    prescription_id: prescription.id,
    clinic_id: CLINIC_ID,
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    duration_days: m.duration_days,
    timings: m.timings,
    instruction: m.instruction,
    needs_review: m.needs_review,
  }))
);

const { error: updateErr } = await staffClient
  .from("prescriptions")
  .update({
    status: "review_required",
    extracted_patient_name: extracted.patient_name,
    patient_name_needs_review: extracted.patient_name_needs_review,
    follow_up_required: extracted.follow_up.required,
    follow_up_days_after: extracted.follow_up.days_after,
    follow_up_instruction: extracted.follow_up.instruction,
    follow_up_needs_review: extracted.follow_up.needs_review,
  })
  .eq("id", prescription.id);
if (updateErr) throw new Error(`update: ${updateErr.message}`);

console.log("Done. View at /clinic/prescriptions/" + prescription.id);

// Delete the temporary staff login only -- keep the prescription as demo data.
await admin.auth.admin.deleteUser(userData.user.id);
console.log("Temporary staff login deleted.");
