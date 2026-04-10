#!/usr/bin/env node
/**
 * Triggers the autonomous announcement reminder job (same logic as GET /api/cron/announcement-reminders).
 *
 * Usage:
 *   CRON_SECRET=your_secret node scripts/run-announcement-reminders.mjs
 *   CRON_URL=https://your-domain.com/api/cron/announcement-reminders node scripts/run-announcement-reminders.mjs
 *
 * Defaults CRON_URL to http://localhost:3000 for local dev.
 */

const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("CRON_SECRET is required.");
  process.exit(1);
}

const base =
  process.env.CRON_URL?.trim().replace(/\/$/, "") ||
  "http://localhost:3000";
const url = `${base}/api/cron/announcement-reminders`;

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.json().catch(() => ({}));
console.log(JSON.stringify(body, null, 2));
if (!res.ok) {
  process.exit(1);
}
