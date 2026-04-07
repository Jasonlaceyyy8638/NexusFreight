import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  if (!secret || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY, STRIPE_PRICE_ID)." },
      { status: 503 }
    );
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
    .select("stripe_subscription_id, trial_ends_at, role")
    .eq("id", user.id)
    .maybeSingle();

  const row = profile as {
    stripe_subscription_id?: string | null;
    trial_ends_at?: string | null;
    role?: string | null;
  } | null;

  if (row?.role === "Driver") {
    return NextResponse.json(
      { error: "Driver accounts do not use this subscription checkout." },
      { status: 400 }
    );
  }

  if (row?.stripe_subscription_id?.trim()) {
    return NextResponse.json(
      { error: "You already have a subscription on file." },
      { status: 400 }
    );
  }

  const now = Date.now();
  const trialEndMs = row?.trial_ends_at
    ? new Date(row.trial_ends_at).getTime()
    : null;
  /** Align Stripe subscription trial with DB (45d founding / 7d trial) while still active. */
  const trialStillActive = trialEndMs != null && trialEndMs > now;

  const stripe = new Stripe(secret);

  const subscriptionData: {
    metadata: Record<string, string>;
    trial_end?: number;
  } = {
    metadata: {
      supabase_user_id: user.id,
    },
  };
  if (trialStillActive && trialEndMs != null) {
    subscriptionData.trial_end = Math.floor(trialEndMs / 1000);
  }

  const sessionParams: Parameters<Stripe["checkout"]["sessions"]["create"]>[0] =
    {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/api/stripe/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/auth/complete-subscription?canceled=1`,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: subscriptionData,
    /** During active trial: often $0 due; after trial: collect card for billing. */
    payment_method_collection: trialStillActive ? "if_required" : "always",
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json({ error: "No Checkout URL returned." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
