import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  type BillingPlan,
  resolveStripePriceId,
} from "@/lib/stripe/pricing-env";
import {
  buildStripeFirstCheckoutSessionParams,
  publicStripeSiteBase,
  stripeFirstSignupSuccessUrl,
} from "@/lib/stripe/stripe-first-checkout";
import { stripeSubscriptionAllowsNewCheckout } from "@/lib/stripe/subscription-access";

export const runtime = "nodejs";

const BETA_CAP = 5;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  let raw: { plan?: string; testRole?: string } = {};
  try {
    raw = (await req.json()) as { plan?: string; testRole?: string };
  } catch {
    /* empty body */
  }

  const plan: BillingPlan = raw.plan === "yearly" ? "yearly" : "monthly";
  const priceId = resolveStripePriceId(plan);
  const siteBase = publicStripeSiteBase();

  if (!secret || !priceId) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured (STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY or STRIPE_PRICE_ID; optional NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY).",
      },
      { status: 503 }
    );
  }

  /**
   * Dev-only: `/test-onboarding` — same Stripe-first session as pricing (role + price_id metadata),
   * triggered via POST /api/stripe/checkout + header `x-nexus-test-onboarding: 1`.
   */
  const isDevTest =
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-nexus-test-onboarding") === "1";

  if (isDevTest) {
    const testRole: "dispatcher" | "carrier" =
      raw.testRole === "carrier" ? "carrier" : "dispatcher";
    let profileCount = 0;
    const admin = createServiceRoleSupabaseClient();
    if (admin) {
      const { count } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true });
      profileCount = count ?? 0;
    }
    const trialPeriodDays = profileCount < BETA_CAP ? 45 : 7;
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create(
      buildStripeFirstCheckoutSessionParams({
        priceId,
        role: testRole,
        plan,
        trialPeriodDays,
        successUrl: stripeFirstSignupSuccessUrl(),
        cancelUrl: `${siteBase}/test-onboarding`,
      })
    );
    if (!session.url) {
      return NextResponse.json(
        { error: "No Checkout URL returned." },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: session.url });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "stripe_subscription_id, stripe_subscription_status, trial_ends_at, role, is_beta_user, trial_type"
    )
    .eq("id", user.id)
    .maybeSingle();

  const row = profile as {
    stripe_subscription_id?: string | null;
    stripe_subscription_status?: string | null;
    trial_ends_at?: string | null;
    role?: string | null;
    is_beta_user?: boolean | null;
    trial_type?: string | null;
  } | null;

  if (row?.role === "Driver") {
    return NextResponse.json(
      { error: "Driver accounts do not use this subscription checkout." },
      { status: 400 }
    );
  }

  if (
    !stripeSubscriptionAllowsNewCheckout(
      row?.stripe_subscription_id,
      row?.stripe_subscription_status
    )
  ) {
    return NextResponse.json(
      { error: "You already have an active subscription on file." },
      { status: 400 }
    );
  }

  const isBeta =
    row?.is_beta_user === true ||
    (row?.trial_type && String(row.trial_type).toUpperCase() === "BETA");
  const trialPeriodDays = isBeta ? 45 : 7;

  const stripe = new Stripe(secret);

  const subscriptionData: {
    metadata: Record<string, string>;
    trial_period_days: number;
  } = {
    metadata: {
      supabase_user_id: user.id,
      billing_plan: plan,
    },
    trial_period_days: trialPeriodDays,
  };

  const successUrl = stripeFirstSignupSuccessUrl();

  const sessionParams: Parameters<Stripe["checkout"]["sessions"]["create"]>[0] =
    {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${siteBase}/auth/complete-subscription?canceled=1&plan=${plan}`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        billing_plan: plan,
      },
      subscription_data: subscriptionData,
      payment_method_collection: "if_required",
    };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json({ error: "No Checkout URL returned." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
