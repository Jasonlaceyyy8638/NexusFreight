import { NextResponse } from "next/server";
import { executeTelematicsSync } from "@/lib/integrations/telematics-sync-engine";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Cron / manual: Authorization: Bearer CRON_SECRET */
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

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role client not available." },
      { status: 503 }
    );
  }

  const result = await executeTelematicsSync(admin);
  return NextResponse.json({
    ok: true,
    connections: result.connections,
    trucksUpdated: result.trucksUpdated,
    errors: result.errors,
  });
}
