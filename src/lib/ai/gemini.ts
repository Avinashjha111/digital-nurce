import { extractedPrescriptionSchema, type ExtractionResult } from "./types";

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

export async function extractPrescriptionWithGemini(
  fileBytes: Uint8Array,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured." };
  }

  const base64Data = Buffer.from(fileBytes).toString("base64");

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
              { inline_data: { mime_type: mimeType, data: base64Data } },
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

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      error: json?.error?.message ?? `Gemini API error (${res.status})`,
    };
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, error: "Gemini returned no extractable content." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Gemini response was not valid JSON." };
  }

  const validated = extractedPrescriptionSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: `Gemini response did not match the expected shape: ${validated.error.issues[0]?.message}`,
    };
  }

  return { ok: true, data: validated.data };
}
