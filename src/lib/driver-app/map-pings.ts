import type { Driver, DriverLocationRow } from "@/types/database";

export type DriverAppMapPing = {
  driverId: string;
  fullName: string;
  carrierId: string;
  lat: number;
  lng: number;
  lastPingAt: string | null;
};

export function buildDriverAppMapPings(
  rows: DriverLocationRow[],
  drivers: Driver[]
): DriverAppMapPing[] {
  const nameById = new Map(drivers.map((d) => [d.id, d.full_name]));
  return rows.map((r) => ({
    driverId: r.driver_id,
    fullName: nameById.get(r.driver_id)?.trim() || "Driver",
    carrierId: r.carrier_id,
    lat: r.lat,
    lng: r.lng,
    lastPingAt: r.recorded_at ?? null,
  }));
}
