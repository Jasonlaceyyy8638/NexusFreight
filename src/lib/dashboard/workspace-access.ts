/**
 * "Missing company workspace" banner uses this — not MC/DOT/carrier_id.
 * Dispatchers and admins only need a linked organization row (Agency or Carrier).
 */

export type OrgEmbed = {
  id: string;
  name: string;
  type: string;
};

export function normalizeOrgId(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function embedOrg(
  organizations: unknown
): OrgEmbed | null {
  if (organizations == null) return null;
  if (Array.isArray(organizations)) {
    const first = organizations[0];
    if (first && typeof first === "object" && "id" in first) {
      return first as OrgEmbed;
    }
    return null;
  }
  if (typeof organizations === "object" && "id" in organizations) {
    return organizations as OrgEmbed;
  }
  return null;
}

/**
 * True when the profile is linked to a tenant org. Dispatchers never require MC/DOT.
 * Uses `org_id` first; falls back to embedded `organizations` if the FK row is visible.
 */
export function profileHasWorkspaceLink(
  profile: {
    org_id?: string | null;
    role?: string | null;
    organizations?: unknown;
  } | null | undefined
): boolean {
  if (!profile) return false;
  if (normalizeOrgId(profile.org_id)) return true;
  const role = profile.role;
  if (role === "Driver") return false;
  return Boolean(embedOrg(profile.organizations)?.id);
}

export function orgTypeFromEmbed(
  organizations: unknown
): "Carrier" | "Agency" | null {
  const e = embedOrg(organizations);
  if (!e?.type) return null;
  return e.type === "Carrier" ? "Carrier" : "Agency";
}

/** Prefer `profiles.org_id`; fall back to embedded FK if present. */
export function effectiveOrgIdFromProfile(
  profile: {
    org_id?: string | null;
    organizations?: unknown;
  } | null | undefined
): string | null {
  const direct = normalizeOrgId(profile?.org_id);
  if (direct) return direct;
  return embedOrg(profile?.organizations)?.id ?? null;
}

export function organizationNameFromProfile(
  profile: { organizations?: unknown } | null | undefined
): string | null {
  const n = embedOrg(profile?.organizations)?.name?.trim();
  return n || null;
}
