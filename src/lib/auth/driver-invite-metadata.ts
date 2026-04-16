/**
 * Fleet/agency driver invites attach `nf_invite` to Supabase `user_metadata`.
 * We require a one-time password so the account is not only magic-link / PKCE-only.
 */

export function isFleetDriverInviteMetadata(
  userMetadata: Record<string, unknown> | null | undefined
): boolean {
  const v = userMetadata?.nf_invite;
  return v === "fleet_driver" || v === "agency_driver";
}

export function requiresDriverPasswordSet(
  userMetadata: Record<string, unknown> | null | undefined
): boolean {
  if (!isFleetDriverInviteMetadata(userMetadata)) return false;
  if (userMetadata?.nf_password_set === true) return false;
  return true;
}
