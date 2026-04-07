import { NextResponse } from "next/server";
import { fetchCarrierData } from "@/app/actions/fmcsa";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const number = typeof body.number === "string" ? body.number : "";

  const userClient = await createServerSupabaseClient();
  const svc = createServiceRoleSupabaseClient();
  let actorUserId: string | null = null;
  let orgId: string | null = null;
  if (userClient) {
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      actorUserId = user.id;
      const { data: prof } = await userClient
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();
      orgId = (prof as { org_id?: string } | null)?.org_id ?? null;
    }
  }

  const result = await fetchCarrierData(number);

  if (!result.ok) {
    if (result.code === "missing_key") {
      return NextResponse.json(result, { status: 503 });
    }
    if (result.code === "unauthorized") {
      return NextResponse.json(result, { status: 401 });
    }
    if (result.code === "empty") {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: result.error, code: result.code });
  }

  if (svc && actorUserId) {
    const digits = number.replace(/\D/g, "");
    await svc.from("platform_audit_events").insert({
      event_type: "mc_lookup",
      org_id: orgId,
      actor_user_id: actorUserId,
      metadata: { number: digits || number.trim() },
    });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
