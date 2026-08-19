// Standalone test of the real extraction prompt/schema against the Gemini
// API, using the synthetic prescription image from generate-test-prescription.mjs.
// Mirrors src/lib/ai/gemini.ts exactly (kept in sync by hand) since that
// file can't be imported directly outside the Next.js request runtime for
// a plain-Node test.

import { readFileSync } from "node:fs";
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

const extractedMedicineSchema = z.object({
  name: z.string(),
  dosage: z.string().nullable(),
  frequency: z.string().nullable(),
  duration_days: z.number().int().nullable(),
  timings: z.array(z.string()).nullable(),
  instruction: z.string().nullable(),
  needs_review: z.boolean(),
});

const extractedPrescriptionSchema = z.object({
  patient_name: z.string().nullable(),
  patient_name_needs_review: z.boolean(),
  medicines: z.array(extractedMedicineSchema),
  follow_up: z.object({
    required: z.boolean().nullable(),
    days_after: z.number().int().nullable(),
    instruction: z.string().nullable(),
    needs_review: z.boolean(),
  }),
});

const MODEL = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION = `You are a prescription data-entry assistant for a clinic system. You are NOT a
doctor and must never behave like one.

Rules, no exceptions:
- Extract ONLY what is clearly, legibly written on the prescription image/PDF.
- Never diagnose, never recommend a medicine, never invent or infer a dosage,
  frequency, duration, timing, or instruction that is not explicitly legible.
- If any field is unclear, illegible, ambiguous, or absent, set it to null and
  set the matching *_needs_review flag to true. Do not guess.
- Medicine "timings" must only be filled in if specific clock times or a
  timing pattern (e.g. morning/afternoon/night) is explicitly written; convert
  obvious patterns to 24h "HH:MM" strings, otherwise leave null.
- Follow-up must only be marked required=true if the prescription explicitly
  says to come back / follow up. Otherwise required=false, not null, unless
  the document is too unclear to tell (then null + needs_review=true).
- Output must match the provided JSON schema exactly.`;

const USER_PROMPT =
  "Extract the patient name, every medicine, and any follow-up instruction from this prescription.";

const responseSchema = {
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
};

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set.");
  process.exit(1);
}

const imageFile = process.argv[2] || "../.test-prescription.png";
const imagePath = new URL(imageFile, import.meta.url);
const fileBytes = readFileSync(imagePath);
const base64Data = fileBytes.toString("base64");

console.log("Calling Gemini API...");
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [
        {
          parts: [
            { text: USER_PROMPT },
            { inline_data: { mime_type: "image/png", data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
      },
    }),
  }
);

const json = await res.json();

if (!res.ok) {
  console.error("HTTP", res.status, JSON.stringify(json, null, 2));
  process.exit(1);
}

const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
if (!text) {
  console.error("No text in response:", JSON.stringify(json, null, 2));
  process.exit(1);
}

const parsed = JSON.parse(text);
console.log("\n--- Raw Gemini JSON ---");
console.log(JSON.stringify(parsed, null, 2));

const validated = extractedPrescriptionSchema.safeParse(parsed);
console.log("\n--- Zod validation ---");
console.log(validated.success ? "PASS - matches expected shape" : `FAIL - ${validated.error.message}`);
