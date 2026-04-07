import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/log-action";
import { sendRefundProcessedEmail } from "@/lib/email/admin-customer-notify";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  userId?: string;
  reason?: string;
};

async function resolveCustomerId(
  stripe: Stripe,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
): Promise<string | null> {
  if (stripeCustomerId?.trim()) return stripeCustomerId.trim();
  if (!stripeSubscriptionId?.trim()) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId.trim());
    const c = sub.customer;
    return typeof c === "string" ? c : c.id;
  } catch {
    return null;
  }
}

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
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const p = profile as {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };

  const stripe = new Stripe(secret);
  const customerId = await resolveCustomerId(
    stripe,
    p.stripe_customer_id ?? null,
    p.stripe_subscription_id ?? null
  );

  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer found for this user." },
      { status: 400 }
    );
  }

  const charges = await stripe.charges.list({
    customer: customerId,
    limit: 25,
  });

  const succeeded = charges.data.find(
    (c) =>
      c.status === "succeeded" &&
      (c.amount_refunded ?? 0) < c.amount
  );
  if (!succeeded) {
    return NextResponse.json(
      { error: "No refundable charge found." },
      { status: 400 }
    );
  }

  try {
    await stripe.refunds.create({ charge: succeeded.id });
  } catch (e) {
    console.error("[admin/refund] stripe:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refund failed." },
      { status: 502 }
    );
  }

  const { data: authUser } = await svc.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.trim();

  await logAdminAction({
    adminEmail: adminUser.email,
    affectedUserId: userId,
    action: "refund",
    reason: reason || null,
    metadata: {
      charge_id: succeeded.id,
      amount_cents: succeeded.amount,
    },
  });

  if (email) {
    try {
      await sendRefundProcessedEmail(email);
    } catch (e) {
      console.error("[admin/refund] email:", e);
    }
  }

  return NextResponse.json({ ok: true, chargeId: succeeded.id });
}
