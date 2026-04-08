import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/log-action";
import { sendAccountCanceledEmail } from "@/lib/email/admin-customer-notify";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  userId?: string;
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
  const reason = body.reason?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json({ error: "Server error." }, { status: 503 });
  }

  const { data: profile, error: pErr } = await svc
    .from("profiles")
    .select("stripe_subscription_id, stripe_subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const subId = (profile as { stripe_subscription_id?: string | null })
    .stripe_subscription_id?.trim();

  const stripe = new Stripe(secret);

  if (subId) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.error("[admin/cancel] stripe:", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Stripe cancel failed." },
        { status: 502 }
      );
    }
  }

  const { error: uErr } = await svc
    .from("profiles")
    .update({
      stripe_subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (uErr) {
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 }
    );
  }

  const { data: authUser } = await svc.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.trim();

  await logAdminAction({
    adminEmail: adminUser.email,
    affectedUserId: userId,
    action: "cancel_subscription",
    reason: reason || null,
    metadata: { stripe_subscription_id: subId ?? null },
  });

  if (email) {
    try {
      await sendAccountCanceledEmail(email);
    } catch (e) {
      console.error("[admin/cancel] email:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
