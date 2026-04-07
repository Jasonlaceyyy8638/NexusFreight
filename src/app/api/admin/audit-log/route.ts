import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminAuditRow = {
  id: string;
  event_type: string;
  org_id: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(limitRaw ?? "200", 10) || 200)
  );

  const { data, error } = await svc
    .from("platform_audit_events")
    .select("id, event_type, org_id, actor_user_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not load audit log." },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: (data ?? []) as AdminAuditRow[] });
}
