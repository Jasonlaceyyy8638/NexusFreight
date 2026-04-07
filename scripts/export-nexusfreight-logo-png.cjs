/**
 * Rasterize nexusfreight-logo-v2.svg to 512×512 PNG for Crisp (SVG URI issues).
 * Uses the full charcoal panel + wordmark so white "Nexus" stays visible; outer
 * canvas padding is transparent.
 * Run from repo root: node scripts/export-nexusfreight-logo-png.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "nexusfreight-logo-v2.png");
const SVG_IN = path.join(__dirname, "..", "public", "nexusfreight-logo-v2.svg");

async function main() {
  const svg = fs.readFileSync(SVG_IN);
  await sharp(svg)
    .resize(512, 512, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`Wrote ${OUT} (${meta.width}×${meta.height})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
