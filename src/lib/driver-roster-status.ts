import type { DriverRosterStatus } from "@/types/database";

export const DRIVER_ROSTER_STATUSES: readonly DriverRosterStatus[] = [
  "active",
  "on_vacation",
  "terminated",
] as const;

export function driverRosterLabel(s: string): string {
  switch (s) {
    case "active":
      return "Active";
    case "on_vacation":
      return "On vacation";
    case "terminated":
      return "Terminated";
    default:
      return s.replace(/_/g, " ");
  }
}

/** Map pre-migration statuses for display until DB is migrated. */
export function normalizeDriverRosterStatus(raw: string): DriverRosterStatus {
  if (
    raw === "active" ||
    raw === "on_vacation" ||
    raw === "terminated"
  ) {
    return raw;
  }
  if (raw === "inactive") return "terminated";
  return "active";
}
