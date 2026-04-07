/**
 * Resolves the number used for {{dispatcher_phone}} in SMS templates.
 * 1) Logged-in profile `phone_number`, then legacy `phone`
 * 2) `COMPANY_MAIN_PHONE` (main business line — set in env)
 */
export function resolveDispatcherPhoneNumber(profile: {
  phone_number?: string | null;
  phone?: string | null;
}): string | null {
  const fromProfile =
    profile.phone_number?.trim() || profile.phone?.trim() || "";
  if (fromProfile) return fromProfile;
  const main = process.env.COMPANY_MAIN_PHONE?.trim();
  return main || null;
}
