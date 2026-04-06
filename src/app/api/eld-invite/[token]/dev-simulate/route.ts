import { NextResponse } from "next/server";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function simulationAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ELD_DEV_SIMULATION === "true";
}

/**
 * Inserts demo trucks with GPS for the invite's carrier (Live Map smoke test).
 * Gated by NODE_ENV=development or ELD_DEV_SIMULATION=true.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!simulationAllowed()) {
    return NextResponse.json({ error: "Not enabled." }, { status: 403 });
  }

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
    .select("carrier_id, agency_org_id")
    .eq("id", token)
    .maybeSingle();

  if (error || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = inv as { carrier_id: string; agency_org_id: string };
  const orgId = row.agency_org_id;
  const carrierId = row.carrier_id;

  const now = new Date().toISOString();
  const demoUnits = ["DEMO-ELD-SIM-1", "DEMO-ELD-SIM-2"];

  await admin
    .from("trucks")
    .delete()
    .eq("carrier_id", carrierId)
    .in("unit_number", demoUnits);

  const { data: inserted, error: insErr } = await admin
    .from("trucks")
    .insert([
      {
        org_id: orgId,
        carrier_id: carrierId,
        unit_number: demoUnits[0]!,
        last_lat: 39.7817 + Math.random() * 0.02,
        last_lng: -104.9728 + Math.random() * 0.02,
        current_latitude: 39.7817 + Math.random() * 0.02,
        current_longitude: -104.9728 + Math.random() * 0.02,
        last_ping_at: now,
        updated_at: now,
      },
      {
        org_id: orgId,
        carrier_id: carrierId,
        unit_number: demoUnits[1]!,
        last_lat: 32.7767 + Math.random() * 0.02,
        last_lng: -96.797 + Math.random() * 0.02,
        current_latitude: 32.7767 + Math.random() * 0.02,
        current_longitude: -96.797 + Math.random() * 0.02,
        last_ping_at: now,
        updated_at: now,
      },
    ])
    .select("id");

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    trucksInserted: (inserted ?? []).length,
  });
}
