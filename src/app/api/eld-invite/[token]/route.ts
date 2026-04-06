import { NextResponse } from "next/server";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";
import { motiveAuthorizeConfigured } from "@/lib/integrations/motive-oauth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!isEldInviteTokenShape(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
  }

  const { data: inv, error } = await admin
    .from("eld_connect_invites")
    .select("id, expires_at, completed_at, carrier_id, agency_org_id")
    .eq("id", token)
    .maybeSingle();

  if (error || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = inv as {
    expires_at: string;
    completed_at: string | null;
    carrier_id: string;
    agency_org_id: string;
  };

  const now = Date.now();
  if (row.completed_at != null || new Date(row.expires_at).getTime() <= now) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: carrier } = await admin
    .from("carriers")
    .select("name, org_id")
    .eq("id", row.carrier_id)
    .maybeSingle();
  const c = carrier as { name?: string; org_id?: string } | null;
  if (!c?.name || c.org_id !== row.agency_org_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: agency } = await admin
    .from("organizations")
    .select("name")
    .eq("id", row.agency_org_id)
    .maybeSingle();
  const agencyName =
    (agency as { name?: string } | null)?.name ?? "your dispatcher";

  return NextResponse.json({
    carrierName: c.name,
    agencyName,
    expiresAt: row.expires_at,
    motiveOAuthReady: motiveAuthorizeConfigured(),
  });
}
