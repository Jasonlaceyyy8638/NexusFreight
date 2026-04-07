import { NextRequest, NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminShieldCarrierRow = {
  id: string;
  name: string;
  mc_number: string | null;
  compliance_status: string | null;
  compliance_alert: string | null;
  compliance_log: string | null;
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

  if (oErr || !org || org.type !== "Agency") {
    return NextResponse.json(
      { error: "Invalid or non-agency organization." },
      { status: 400 }
    );
  }

  const { data: rows, error } = await svc
    .from("carriers")
    .select(
      "id, name, mc_number, compliance_status, compliance_alert, compliance_log"
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/org-insights/shield]", error.message);
    return NextResponse.json(
      { error: "Could not load carriers." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    carriers: (rows ?? []) as AdminShieldCarrierRow[],
  });
}
