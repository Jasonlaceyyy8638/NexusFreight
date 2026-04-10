import { NextResponse } from "next/server";
import { fetchAnnouncementsAnalyticsDashboard } from "@/lib/admin/announcement-analytics-dashboard";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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
    const data = await fetchAnnouncementsAnalyticsDashboard(svc);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analytics failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
