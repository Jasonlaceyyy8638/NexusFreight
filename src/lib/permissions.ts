import type { ProfileRole } from "@/types/database";

export type DashboardPermissionFlags = {
  can_view_financials: boolean;
  can_dispatch_loads: boolean;
  can_edit_fleet: boolean;
  admin_access: boolean;
};

/** Preview / offline: full access so the product demo stays usable. */
export const PERMISSIONS_FULL_ACCESS: DashboardPermissionFlags = {
  can_view_financials: true,
  can_dispatch_loads: true,
  can_edit_fleet: true,
  admin_access: true,
};

export function fallbackPermissionsFromRole(
  role: ProfileRole | string | null
): DashboardPermissionFlags {
  if (role === "Admin") return PERMISSIONS_FULL_ACCESS;
  if (role === "Dispatcher") {
    return {
      can_view_financials: false,
      can_dispatch_loads: true,
      can_edit_fleet: false,
      admin_access: false,
    };
  }
  return {
    can_view_financials: false,
    can_dispatch_loads: false,
    can_edit_fleet: false,
    admin_access: false,
  };
}

export function mergePermissionRow(
  role: ProfileRole | string | null,
  row: Partial<DashboardPermissionFlags> | null
): DashboardPermissionFlags {
  const base = fallbackPermissionsFromRole(role);
  if (!row) return base;
  return {
    can_view_financials: row.can_view_financials ?? base.can_view_financials,
    can_dispatch_loads: row.can_dispatch_loads ?? base.can_dispatch_loads,
    can_edit_fleet: row.can_edit_fleet ?? base.can_edit_fleet,
    admin_access: row.admin_access ?? base.admin_access,
  };
}

export function isTeamAdmin(
  role: ProfileRole | string | null,
  permissions: DashboardPermissionFlags
): boolean {
  return role === "Admin" || permissions.admin_access;
}
