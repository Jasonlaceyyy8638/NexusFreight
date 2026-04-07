/**
 * Rasterize public/nexusfreight-logo-v2.svg to PWA icons (192 + 512).
 * Run: node scripts/generate-pwa-icons.cjs
 * Requires: npm install sharp --save-dev
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const sharp = require("sharp");
  const svgPath = path.join(__dirname, "..", "public", "nexusfreight-logo-v2.svg");
  const outDir = path.join(__dirname, "..", "public", "icons");
  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(svgPath);

  await sharp(svg)
    .resize(192, 192, { fit: "contain", background: { r: 13, g: 14, b: 16, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, "icon-192.png"));

  await sharp(svg)
    .resize(512, 512, { fit: "contain", background: { r: 13, g: 14, b: 16, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, "icon-512.png"));

  console.log("Wrote public/icons/icon-192.png and icon-512.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
