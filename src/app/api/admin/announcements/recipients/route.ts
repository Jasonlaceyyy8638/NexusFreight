import { NextResponse } from "next/server";
import { collectAnnouncementRecipients } from "@/lib/admin/announcement-recipients";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * List emails that will receive bulk announcements (profiles.auth_email, not opted out).
 */
export async function GET() {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  try {
    const rows = await collectAnnouncementRecipients(svc);
    const emails = rows.map((r) => r.email);
    return NextResponse.json({ count: emails.length, emails });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load recipients.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
