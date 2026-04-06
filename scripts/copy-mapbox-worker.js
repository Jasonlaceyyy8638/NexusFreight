/**
 * Copy Mapbox CSP worker to /public so it is same-origin as the app.
 * Cross-origin worker URLs (e.g. api.mapbox.com) fail with:
 * "Failed to construct 'Worker': Script at ... cannot be accessed from origin ..."
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(
  root,
  "node_modules",
  "mapbox-gl",
  "dist",
  "mapbox-gl-csp-worker.js"
);
const destDir = path.join(root, "public");
const dest = path.join(destDir, "mapbox-gl-csp-worker.js");

if (!fs.existsSync(src)) {
  console.warn(
    "[copy-mapbox-worker] mapbox-gl not installed yet, skip (run again after npm install)"
  );
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-mapbox-worker] wrote public/mapbox-gl-csp-worker.js");
