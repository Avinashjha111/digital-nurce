import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Deliberately missing/unclear fields: no patient name written, one medicine
// has no dosage/frequency, no follow-up mentioned at all.
const svg = `
<svg width="700" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="30" y="40" font-size="22" font-family="Georgia, serif" font-weight="bold">City Care Clinic - Prescription</text>
  <line x1="30" y1="52" x2="670" y2="52" stroke="#333" stroke-width="2"/>
  <text x="30" y="90" font-size="16" font-family="Georgia, serif">Date: 19-Aug-2026</text>

  <text x="30" y="140" font-size="16" font-family="Georgia, serif">Rx: Cetirizine</text>
</svg>`;

const outPath = fileURLToPath(new URL("../.test-prescription-unclear.png", import.meta.url));
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("wrote", outPath);
