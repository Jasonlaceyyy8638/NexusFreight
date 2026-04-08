/**
 * Stripe subscription price IDs — read from any supported env name.
 * Used by API routes and by next.config.ts so builds pick up IDs from
 * server-only vars (STRIPE_PRICE_ID_*) as well as NEXT_PUBLIC_*.
 */
export function resolveStripeMonthlyPriceIdFromEnv(): string {
  return (
    process.env.STRIPE_PRICE_ID_MONTHLY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim() ||
    ""
  );
}

export function resolveStripeYearlyPriceIdFromEnv(): string {
  return (
    process.env.STRIPE_PRICE_ID_YEARLY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY?.trim() ||
    ""
  );
}
