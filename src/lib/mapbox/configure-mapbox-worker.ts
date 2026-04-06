import mapboxgl from "mapbox-gl";

let configured = false;

/**
 * 1) Next/Turbopack can break Mapbox's default worker bootstrap (dynamic import).
 * 2) Browsers reject Workers whose script URL is another origin (e.g. api.mapbox.com vs localhost).
 * Serve the CSP worker from /public (copied in postinstall) so it matches the page origin.
 */
export function ensureMapboxWorkerConfigured(): void {
  if (typeof window === "undefined" || configured) return;
  configured = true;
  mapboxgl.workerUrl = `${window.location.origin}/mapbox-gl-csp-worker.js`;
}
