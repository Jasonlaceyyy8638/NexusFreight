import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/log-action";
import { sendCreditAddedEmail } from "@/lib/email/admin-customer-notify";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  userId?: string;
  amountUsd?: number;
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
  const amountUsd = body.amountUsd;
  const reason = body.reason?.trim() ?? "";

  if (!userId) {
    return NextResponse.json({ error: "userId required." }, { status: 400 });
  }
  if (
    amountUsd == null ||
    typeof amountUsd !== "number" ||
    Number.isNaN(amountUsd) ||
    amountUsd <= 0
  ) {
    return NextResponse.json(
      { error: "amountUsd must be a positive number." },
      { status: 400 }
    );
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

  const cents = Math.round(amountUsd * 100);
  if (cents < 1) {
    return NextResponse.json({ error: "Amount too small." }, { status: 400 });
  }

  try {
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -cents,
      currency: "usd",
      description: "Nexus Control account credit",
    });
  } catch (e) {
    console.error("[admin/credit] stripe:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Credit failed." },
      { status: 502 }
    );
  }

  const { data: authUser } = await svc.auth.admin.getUserById(userId);
  const email = authUser.user?.email?.trim();
  const amountLabel = amountUsd.toFixed(2);

  await logAdminAction({
    adminEmail: adminUser.email,
    affectedUserId: userId,
    action: "add_credit",
    reason: reason || null,
    metadata: { amount_usd: amountUsd, cents },
  });

  if (email) {
    try {
      await sendCreditAddedEmail(email, amountLabel);
    } catch (e) {
      console.error("[admin/credit] email:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
