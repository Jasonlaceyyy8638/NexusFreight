/**
 * Rasterize public/nexusfreight-logo-v2.svg to PWA / Apple icons.
 * Run: npm run generate-pwa-icons
 */
const fs = require("fs");
const path = require("path");

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const MIDNIGHT = { r: 26, g: 28, b: 30, alpha: 1 };

async function main() {
  const sharp = require("sharp");
  const svgPath = path.join(__dirname, "..", "public", "nexusfreight-logo-v2.svg");
  const svg = fs.readFileSync(svgPath);
  const publicDir = path.join(__dirname, "..", "public");
  const iconsDir = path.join(publicDir, "icons");
  fs.mkdirSync(iconsDir, { recursive: true });

  const write = (outPath, size, bg) =>
    sharp(svg)
      .resize(size, size, { fit: "contain", background: bg })
      .png()
      .toFile(outPath);

  await write(path.join(iconsDir, "icon-192.png"), 192, MIDNIGHT);
  await write(path.join(iconsDir, "icon-512.png"), 512, MIDNIGHT);

  await write(path.join(publicDir, "icon-192x192.png"), 192, BLACK);
  await write(path.join(publicDir, "icon-512x512.png"), 512, BLACK);
  await write(path.join(publicDir, "apple-touch-icon.png"), 180, BLACK);

  console.log(
    "Wrote public/icons/icon-192.png, icon-512.png; public/icon-192x192.png, icon-512x512.png, apple-touch-icon.png"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
