import type { Config } from "@netlify/functions";

/**
 * Triggers the Next.js nightly FMCSA compliance job (Bearer CRON_SECRET).
 * Schedule: 02:00 UTC daily. Logic + 3s inter-carrier delay live in
 * `runFmcsaComplianceMonitor` → GET/POST /api/cron/fmcsa-compliance
 */
export default async function handler() {
  const secret = process.env.CRON_SECRET?.trim();
  const base =
    process.env.URL?.replace(/\/$/, "") ||
    process.env.DEPLOY_PRIME_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!secret || !base) {
    console.error(
      "[nightly-compliance] Missing CRON_SECRET or URL / NEXT_PUBLIC_APP_URL"
    );
    return new Response(
      JSON.stringify({ error: "Missing CRON_SECRET or site URL env." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(`${base}/api/cron/fmcsa-compliance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  console.log("[nightly-compliance]", res.status, text.slice(0, 800));

  return new Response(text, {
    status: res.ok ? 200 : res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const config: Config = {
  schedule: "0 2 * * *",
};
