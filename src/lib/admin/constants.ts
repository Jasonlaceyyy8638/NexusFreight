/**
 * Nexus Control admin identity: only this **signed-in** Supabase Auth email may access
 * `/admin/control-center` and `/api/admin/*`. Everyone else gets 404 / unauthorized.
 *
 * Default: `info@nexusfreight.tech`. Optional server env `ADMIN_CONTROL_EMAIL` overrides
 * (e.g. staging). Comparison is always case-insensitive.
 */
function resolveAdminControlEmail(): string {
  const fromEnv = process.env.ADMIN_CONTROL_EMAIL?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  return "info@nexusfreight.tech";
}

export const ADMIN_CONTROL_EMAIL: string = resolveAdminControlEmail();

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_CONTROL_EMAIL;
}

/** Sidebar “Nexus Control” link: only this signed-in user (corporate support). */
export const CORPORATE_NEXUS_CONTROL_SIDEBAR_EMAIL =
  "info@nexusfreight.tech" as const;

export function isCorporateNexusControlSidebarUser(
  email: string | null | undefined
): boolean {
  return (
    (email ?? "").trim().toLowerCase() ===
    CORPORATE_NEXUS_CONTROL_SIDEBAR_EMAIL
  );
}

/** Nexus Control page + `/api/admin/*`: env admin or corporate `info@` account. */
export function canAccessNexusControlAdmin(
  email: string | null | undefined
): boolean {
  return isAdminEmail(email) || isCorporateNexusControlSidebarUser(email);
}
