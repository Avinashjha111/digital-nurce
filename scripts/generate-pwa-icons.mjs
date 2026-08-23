// One-off: generates the PWA app icons from the same Lucide Stethoscope
// glyph + orange brand color already used for the in-app sidebar mark, so
// the installed app icon matches the product instead of being a generic
// placeholder. Run once; the PNGs it writes to public/icons are committed.

import sharp from "sharp";
import { mkdirSync } from "node:fs";

const ORANGE = "#F97316";

// Lucide "stethoscope" path data (viewBox 0 0 24 24), stroke-based --
// same icon used in the app's sidebar brand mark.
const STETHOSCOPE_PATHS = `
  <path d="M11 2v2" />
  <path d="M5 2v2" />
  <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
  <path d="M8 15a6 6 0 0 0 12 0v-3" />
  <circle cx="20" cy="10" r="2" />
`;

function iconSvg({ size, cornerRadius, glyphScale, glyphOffsetY = 0 }) {
  const glyphSize = 24 * glyphScale;
  const offset = (size - glyphSize) / 2;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${ORANGE}" />
  <g transform="translate(${offset}, ${offset + glyphOffsetY}) scale(${glyphScale})"
     fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    ${STETHOSCOPE_PATHS}
  </g>
</svg>`;
}

mkdirSync("public/icons", { recursive: true });

const targets = [
  // "any" purpose: glyph fills most of the canvas, rounded-square mark.
  { file: "icon-192.png", size: 192, cornerRadius: 40, glyphScale: 5.2 },
  { file: "icon-512.png", size: 512, cornerRadius: 108, glyphScale: 13.8 },
  { file: "apple-touch-icon.png", size: 180, cornerRadius: 38, glyphScale: 4.9 },
  // "maskable" purpose: OS may crop to a circle/squircle, so the glyph
  // must sit inside a safe zone -- smaller scale, no rounded corners
  // needed since the OS supplies its own mask shape.
  { file: "icon-maskable-512.png", size: 512, cornerRadius: 0, glyphScale: 9.5 },
];

for (const t of targets) {
  const svg = iconSvg(t);
  await sharp(Buffer.from(svg)).png().toFile(`public/icons/${t.file}`);
  console.log("wrote", t.file);
}
