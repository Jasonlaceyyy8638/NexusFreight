import { LOAD_STATUS_LABELS } from "@/lib/load-status-labels";
import {
  DRIVER_LOAD_API_VERSION,
  type DriverLoadResource,
} from "@/types/api/driver-load";
import type { LoadStatus } from "@/types/database";

type LoadRowSlice = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  driver_notified_at?: string | null;
};

export function driverLoadResourceFromRow(row: LoadRowSlice): DriverLoadResource {
  const status = row.status as LoadStatus;
  return {
    schema_version: DRIVER_LOAD_API_VERSION,
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    status,
    status_label: LOAD_STATUS_LABELS[status] ?? row.status,
    timestamps: {
      dispatched_at: row.dispatched_at,
      delivered_at: row.delivered_at,
      driver_notified_at: row.driver_notified_at ?? null,
    },
  };
}
