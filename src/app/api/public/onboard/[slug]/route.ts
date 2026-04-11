import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Public: check whether an onboarding slug is valid (does not leak org details). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const s = slug?.trim().toLowerCase() ?? "";
  if (s.length < 4 || s.length > 64) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("organizations")
    .select("id")
    .eq("type", "Agency")
    .eq("onboarding_slug", s)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({ valid: true });
}
