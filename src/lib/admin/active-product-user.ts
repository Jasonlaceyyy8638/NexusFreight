/**
 * "Active" = entitled to product (beta, trial not expired, or paid/trialing subscription).
 * Product announcements use all profiles with auth_email instead; this helper is for other logic.
 */
export function isActiveProductUser(p: {
  is_beta_user: boolean | null | undefined;
  trial_ends_at: string | null | undefined;
  stripe_subscription_status: string | null | undefined;
}): boolean {
  const now = Date.now();
  if (p.is_beta_user === true) return true;
  const trialEnd = p.trial_ends_at
    ? new Date(p.trial_ends_at).getTime()
    : null;
  if (trialEnd != null && !Number.isNaN(trialEnd) && trialEnd > now) return true;
  const st = (p.stripe_subscription_status ?? "").trim().toLowerCase();
  if (st === "active" || st === "trialing") return true;
  return false;
}
