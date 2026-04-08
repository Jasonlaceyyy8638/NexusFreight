/**
 * Dashboard access for Stripe-backed accounts uses subscription.status from Stripe
 * (synced via webhooks), not only the presence of stripe_subscription_id.
 */

/** Subscription is paid or in a recoverable billing state — keep dashboard access. */
export const ACCESS_GRANTING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due", // Stripe is still retrying payment; revoke only when Stripe moves to canceled/unpaid
]);

/**
 * Returns true if the user should have dispatcher/carrier dashboard access
 * based on Stripe subscription state.
 *
 * - No subscription id: not covered here (use trial_ends_at in proxy).
 * - Legacy rows (subscription id set, status null): treat as active until webhooks backfill.
 */
export function stripeSubscriptionAllowsAccess(
  stripeSubscriptionId: string | null | undefined,
  stripeSubscriptionStatus: string | null | undefined
): boolean {
  const id = stripeSubscriptionId?.trim();
  if (!id) return false;
  const raw = stripeSubscriptionStatus?.trim().toLowerCase();
  if (!raw) return true;
  return ACCESS_GRANTING_STATUSES.has(raw);
}

const BLOCKS_NEW_CHECKOUT = new Set([
  "active",
  "trialing",
  "past_due",
  "incomplete",
]);

/** User can start a new Checkout session (e.g. after cancel / trial ended). */
export function stripeSubscriptionAllowsNewCheckout(
  stripeSubscriptionId: string | null | undefined,
  stripeSubscriptionStatus: string | null | undefined
): boolean {
  const id = stripeSubscriptionId?.trim();
  if (!id) return true;
  const raw = stripeSubscriptionStatus?.trim().toLowerCase() ?? "";
  if (!raw) return false;
  return !BLOCKS_NEW_CHECKOUT.has(raw);
}
