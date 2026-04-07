import type { LoadStatus } from "@/types/database";

/**
 * Stable JSON contract for driver-facing clients (mobile web, native app).
 * Version bumps when fields are added or renamed.
 */
export const DRIVER_LOAD_API_VERSION = 1 as const;

/** Timestamps exposed to drivers (ISO 8601 strings). */
export type DriverLoadTimestamps = {
  dispatched_at: string | null;
  delivered_at: string | null;
  driver_notified_at: string | null;
};

/**
 * GET /api/v1/loads/:loadId — success body.
 * Intentionally excludes financials, internal IDs beyond load id, and file paths.
 */
export type DriverLoadResource = {
  schema_version: typeof DRIVER_LOAD_API_VERSION;
  id: string;
  origin: string;
  destination: string;
  status: LoadStatus;
  status_label: string;
  timestamps: DriverLoadTimestamps;
};

export type DriverLoadApiSuccess = {
  data: DriverLoadResource;
};

export type DriverLoadApiError = {
  error: string;
  code?: string;
};
