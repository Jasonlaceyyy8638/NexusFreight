import {
  resolveStripeMonthlyPriceIdFromEnv,
  resolveStripeYearlyPriceIdFromEnv,
} from "@/lib/stripe/resolve-stripe-price-env";

/**
 * Subscription price IDs — see `resolve-stripe-price-env.ts` and `next.config.ts`.
 */
export type BillingPlan = "monthly" | "yearly";

export function resolveStripePriceId(plan: BillingPlan): string | null {
  const monthly = resolveStripeMonthlyPriceIdFromEnv() || null;
  const yearly = resolveStripeYearlyPriceIdFromEnv() || null;
  if (plan === "yearly" && yearly) return yearly;
  if (plan === "yearly" && !yearly && monthly) return monthly;
  return monthly;
}

export function isStripePricingConfigured(): boolean {
  return Boolean(resolveStripePriceId("monthly"));
}
