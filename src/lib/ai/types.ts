import { z } from "zod";

// Mirrors the spec's extraction JSON shape. Every field Gemini isn't
// confident about should come back null with the matching needs_review
// flag set -- never guessed.

export const extractedMedicineSchema = z.object({
  name: z.string(),
  dosage: z.string().nullable(),
  frequency: z.string().nullable(),
  duration_days: z.number().int().nullable(),
  timings: z.array(z.string()).nullable(),
  instruction: z.string().nullable(),
  needs_review: z.boolean(),
});

export const extractedPrescriptionSchema = z.object({
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

export type ExtractedMedicine = z.infer<typeof extractedMedicineSchema>;
export type ExtractedPrescription = z.infer<typeof extractedPrescriptionSchema>;

export type ExtractionResult =
  | { ok: true; data: ExtractedPrescription }
  | { ok: false; error: string };
