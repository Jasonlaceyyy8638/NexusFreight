import { NextRequest, NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminFleetLoadRow = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  rate_cents: number;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId")?.trim();
  if (!orgId) {
    return NextResponse.json({ error: "orgId required." }, { status: 400 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const { data: org, error: oErr } = await svc
    .from("organizations")
    .select("id, type")
    .eq("id", orgId)
    .maybeSingle();

  if (oErr || !org || org.type !== "Carrier") {
    return NextResponse.json(
      { error: "Invalid or non-carrier organization." },
      { status: 400 }
    );
  }

  const { data: rows, error } = await svc
    .from("loads")
    .select(
      "id, origin, destination, status, rate_cents, dispatched_at, delivered_at, created_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/org-insights/fleet-loads]", error.message);
    return NextResponse.json(
      { error: "Could not load loads." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    loads: (rows ?? []) as AdminFleetLoadRow[],
  });
}
