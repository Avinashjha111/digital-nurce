// Internal AI abstraction so the extraction provider can be swapped later
// without touching call sites. Gemini is the only implementation today.

import { extractPrescriptionWithGemini } from "./gemini";
import type { ExtractionResult } from "./types";

export const aiService = {
  extractPrescription(fileBytes: Uint8Array, mimeType: string): Promise<ExtractionResult> {
    return extractPrescriptionWithGemini(fileBytes, mimeType);
  },
};
