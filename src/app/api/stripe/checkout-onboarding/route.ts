import { NextResponse } from "next/server";
import Stripe from "stripe";
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

export const runtime = "nodejs";

const BETA_CAP = 5;

/**
 * Public: start subscription Checkout before signup (Stripe-first onboarding).
 * Metadata carries role + plan; trial length follows founding spots (<5 profiles → 45d).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  let type: "dispatcher" | "carrier" = "dispatcher";
  let plan: BillingPlan = "monthly";
  try {
    const body = (await req.json()) as {
      type?: string;
      plan?: string;
    };
    if (body?.type === "carrier") type = "carrier";
    if (body?.plan === "yearly") plan = "yearly";
  } catch {
    /* invalid body */
  }

  const priceId = resolveStripePriceId(plan);
  const origin = publicStripeSiteBase();

  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Missing STRIPE_SECRET_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          plan === "yearly"
            ? "Missing yearly price ID. Set STRIPE_PRICE_ID_YEARLY or NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY in .env.local and restart."
            : "Missing monthly price ID. Set STRIPE_PRICE_ID_MONTHLY, NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY, or STRIPE_PRICE_ID in .env.local and restart.",
      },
      { status: 503 }
    );
  }

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
      role: type,
      plan,
      trialPeriodDays,
      successUrl: stripeFirstSignupSuccessUrl(),
      cancelUrl: `${origin}/#pricing`,
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
