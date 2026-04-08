import type { BillingPlan } from "@/lib/stripe/pricing-env";

/**
 * Public site root for Stripe Checkout success/cancel URLs only (API routes).
 * Optional STRIPE_CHECKOUT_SITE_BASE overrides NEXT_PUBLIC_* so local dev can
 * keep NEXT_PUBLIC_SITE_URL pointing at production (emails, OAuth, etc.) while
 * still returning users to localhost after payment.
 */
export function publicStripeSiteBase(): string {
  return (
    process.env.STRIPE_CHECKOUT_SITE_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Success return for Stripe-first flows — uses NEXT_PUBLIC_SITE_URL when set.
 * Stripe replaces {CHECKOUT_SESSION_ID}.
 */
export function stripeFirstSignupSuccessUrl(): string {
  return `${publicStripeSiteBase()}/auth/signup?session_id={CHECKOUT_SESSION_ID}`;
}

export function buildStripeFirstCheckoutSessionParams(opts: {
  priceId: string;
  role: "dispatcher" | "carrier";
  plan: BillingPlan;
  trialPeriodDays: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const { priceId, role: type, plan, trialPeriodDays, successUrl, cancelUrl } =
    opts;
  return {
    mode: "subscription" as const,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      role: type,
      plan,
      signup_role: type,
      billing_plan: plan,
      stripe_first: "true",
    },
    subscription_data: {
      trial_period_days: trialPeriodDays,
      metadata: {
        role: type,
        plan,
        signup_role: type,
        billing_plan: plan,
        stripe_first: "true",
      },
    },
    payment_method_collection: "if_required" as const,
  };
}
