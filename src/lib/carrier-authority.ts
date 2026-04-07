import type { Carrier } from "@/types/database";

/** Shown when a carrier cannot be used for new loads or driver roster adds. */
export const CARRIER_AUTHORITY_INACTIVE_TOOLTIP =
  "Cannot assign: Carrier Authority is Inactive.";

/** Load list / dispatch when authority is no longer active. */
export const CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING =
  "Carrier Authority Revoked - Contact Carrier for updated COI/Authority";

export function carrierAuthorityAssignable(
  c: Pick<Carrier, "compliance_status" | "is_active_authority">
): boolean {
  if (c.compliance_status === "inactive") return false;
  if (c.is_active_authority === false) return false;
  return true;
}
