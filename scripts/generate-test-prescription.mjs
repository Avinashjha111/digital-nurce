import sharp from "sharp";
import { fileURLToPath } from "node:url";

const svg = `
<svg width="700" height="420" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="30" y="40" font-size="22" font-family="Georgia, serif" font-weight="bold">City Care Clinic - Prescription</text>
  <line x1="30" y1="52" x2="670" y2="52" stroke="#333" stroke-width="2"/>
  <text x="30" y="90" font-size="16" font-family="Georgia, serif">Patient Name: Priya Sharma</text>
  <text x="30" y="115" font-size="16" font-family="Georgia, serif">Date: 19-Aug-2026</text>

  <rect x="30" y="140" width="640" height="140" fill="none" stroke="#999"/>
  <text x="40" y="160" font-size="14" font-family="Georgia, serif" font-weight="bold">Medicine</text>
  <text x="220" y="160" font-size="14" font-family="Georgia, serif" font-weight="bold">Dosage</text>
  <text x="320" y="160" font-size="14" font-family="Georgia, serif" font-weight="bold">Frequency</text>
  <text x="460" y="160" font-size="14" font-family="Georgia, serif" font-weight="bold">Duration</text>
  <text x="560" y="160" font-size="14" font-family="Georgia, serif" font-weight="bold">Instruction</text>
  <line x1="30" y1="170" x2="670" y2="170" stroke="#999"/>

  <text x="40" y="195" font-size="14" font-family="Georgia, serif">Amoxicillin 500mg</text>
  <text x="220" y="195" font-size="14" font-family="Georgia, serif">1 tablet</text>
  <text x="320" y="195" font-size="14" font-family="Georgia, serif">3 times daily</text>
  <text x="460" y="195" font-size="14" font-family="Georgia, serif">5 days</text>
  <text x="560" y="195" font-size="14" font-family="Georgia, serif">After food</text>

  <text x="40" y="225" font-size="14" font-family="Georgia, serif">Paracetamol 650mg</text>
  <text x="220" y="225" font-size="14" font-family="Georgia, serif">1 tablet</text>
  <text x="320" y="225" font-size="14" font-family="Georgia, serif">Twice daily</text>
  <text x="460" y="225" font-size="14" font-family="Georgia, serif">3 days</text>
  <text x="560" y="225" font-size="14" font-family="Georgia, serif">If fever</text>

  <text x="30" y="320" font-size="16" font-family="Georgia, serif">Follow-up: Please come back after 7 days for review.</text>
</svg>`;

const outPath = fileURLToPath(new URL("../.test-prescription.png", import.meta.url));
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("wrote", outPath);
