import type { Load } from "@/types/database";

export const DRIVER_ACK_ACTIVITY_MESSAGE = "Load acknowledged (driver app)";

export const DRIVER_DECLINE_REASONS = [
  "Vehicle Issue",
  "No Hours of Service",
  "Family Emergency",
] as const;

export type DriverDeclineReason = (typeof DRIVER_DECLINE_REASONS)[number];

export function declineActivityMessage(reason: string): string {
  return `Driver declined load: ${reason}`;
}

export function isLoadAcknowledgedByDriver(load: Load): boolean {
  const log = load.activity_log;
  if (!Array.isArray(log)) return false;
  return log.some(
    (e) =>
      typeof e.message === "string" &&
      e.message.includes(DRIVER_ACK_ACTIVITY_MESSAGE)
  );
}
