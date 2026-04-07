import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/log-action";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  userId?: string;
  trialEndsAt?: string;
  reason?: string;
};

export async function POST(req: Request) {
  const adminUser = await getAdminUserOrNull();
  if (!adminUser) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const trialEndsAt = body.trialEndsAt?.trim();
  const reason = body.reason?.trim() ?? "";

  if (!userId || !trialEndsAt) {
    return NextResponse.json(
      { error: "userId and trialEndsAt (ISO date) required." },
      { status: 400 }
    );
  }

  const parsed = new Date(trialEndsAt);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json({ error: "Server error." }, { status: 503 });
  }

  const iso = parsed.toISOString();

  const { error: uErr } = await svc
    .from("profiles")
    .update({
      trial_ends_at: iso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (uErr) {
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 }
    );
  }

  await logAdminAction({
    adminEmail: adminUser.email,
    affectedUserId: userId,
    action: "trial_override",
    reason: reason || null,
    metadata: { trial_ends_at: iso },
  });

  return NextResponse.json({ ok: true, trialEndsAt: iso });
}
