import { NextResponse } from "next/server";
import { collectDistinctAuthEmails } from "@/lib/admin/announcement-recipients";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Count distinct registered users via Auth (`auth.users` emails), not profiles.auth_email.
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
    const emails = await collectDistinctAuthEmails(svc);
    return NextResponse.json({ count: emails.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not list users.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
