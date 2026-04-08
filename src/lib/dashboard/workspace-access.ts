/**
 * "Missing company workspace" banner uses this — not MC/DOT/carrier_id.
 * Dispatchers and admins only need a linked organization row (Agency or Carrier).
 *
 * DB schema: `organizations.type` is only **Agency** | **Carrier** (CHECK).
 * Dispatch/3PL tenants use **Agency**; fleet tenants use **Carrier**. There is no
 * `dispatcher` org type — use profile.role (Dispatcher / Admin / ...) for the user.
 */

function workspaceGateDebug(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEBUG_WORKSPACE === "1";
  if (!enabled) return;
  console.log("[workspace-access]", payload);
}

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
  const orgId = normalizeOrgId(profile?.org_id);
  const embed = embedOrg(profile?.organizations);
  const role = profile?.role ?? null;

  let result: boolean;
  if (!profile) {
    result = false;
  } else if (orgId) {
    result = true;
  } else if (role === "Driver") {
    result = false;
  } else {
    result = Boolean(embed?.id);
  }

  workspaceGateDebug({
    profileRole: role,
    org_id: orgId,
    embedOrgId: embed?.id ?? null,
    profileHasWorkspaceLink: result,
  });

  return result;
}

/**
 * Org type from FK embed, or infer **Agency** for Dispatcher when `type` is missing
 * (dispatcher tenants are always Agency orgs in this schema).
 */
export function orgTypeFromEmbed(
  organizations: unknown,
  profileRole?: string | null
): "Carrier" | "Agency" | null {
  const e = embedOrg(organizations);
  if (e?.type) {
    return e.type === "Carrier" ? "Carrier" : "Agency";
  }
  if (profileRole === "Dispatcher") {
    return "Agency";
  }
  return null;
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
