import type { LoadStatus } from "@/types/database";

/** Human-readable labels for load status UI (dropdown, badges). */
export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  draft: "Draft",
  dispatched: "Dispatched",
  notification_sent: "Notification Sent",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
