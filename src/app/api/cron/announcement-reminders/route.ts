import { NextResponse } from "next/server";
import { runAnnouncementReminderEngine } from "@/lib/admin/announcement-reminder-engine";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Autonomous re-engagement: 72h+ unread announcement reminders (Resend).
 * Schedule hourly (e.g. Vercel Cron) with Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set." },
      { status: 503 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service role client not available." },
      { status: 503 }
    );
  }

  const result = await runAnnouncementReminderEngine(svc);
  return NextResponse.json(result);
}
