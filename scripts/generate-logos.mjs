// Writes a placeholder wordmark SVG for every band into public/placeholders/logos.
//
//   npm run logos              only bands that don't have a logo file yet
//   npm run logos -- --force   regenerate all of them
//
// These stand in for real logos. To use a real one, drop the file into
// public/ and point `logo()` in src/data/helpers.ts at it.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";

const OUT = fileURLToPath(new URL("../public/placeholders/logos/", import.meta.url));
const force = process.argv.includes("--force");
mkdirSync(OUT, { recursive: true });

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let written = 0;
for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    const file = `${OUT}${band.id}.svg`;
    if (!force && existsSync(file)) continue;

    const text = escapeXml(band.name.toUpperCase());
    // Cropped tight to the text so it aligns like a real, tightly cropped logo.
    const textLength = Math.min(560, band.name.length * 44);
    const width = textLength + 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 120" width="${width}" height="120" role="img" aria-label="${escapeXml(band.name)}">
  <defs>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.85"/>
    </filter>
  </defs>
  <text x="20" y="92" font-family="Impact, 'Arial Black', Georgia, serif" font-size="82" font-weight="900" fill="#ececec" stroke="#000" stroke-width="4" paint-order="stroke" textLength="${textLength}" lengthAdjust="spacingAndGlyphs" filter="url(#shadow)">${text}</text>
</svg>
`;
    writeFileSync(file, svg);
    written++;
  }
}
console.log(`wrote ${written} logo(s) to ${OUT}`);
