import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BETA_CAP = 5;

/** Public: founding member spots left (first `BETA_CAP` profiles). */
export async function GET() {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { profileCount: 0, foundingSpotsRemaining: BETA_CAP, error: "unconfigured" },
      { status: 200 }
    );
  }
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (error) {
    return NextResponse.json(
      { profileCount: 0, foundingSpotsRemaining: BETA_CAP, error: error.message },
      { status: 200 }
    );
  }
  const n = count ?? 0;
  const remaining = Math.max(0, BETA_CAP - n);
  return NextResponse.json({
    profileCount: n,
    foundingSpotsRemaining: remaining,
    betaCap: BETA_CAP,
  });
}
