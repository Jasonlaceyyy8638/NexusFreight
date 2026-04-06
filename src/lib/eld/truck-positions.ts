import type { Carrier, EldConnection, Truck } from "@/types/database";

export type TruckMapPing = {
  truck: Truck;
  lng: number;
  lat: number;
  source: "eld" | "db";
  /** Carrier has an ELD / telematics connection row */
  carrierHasEld: boolean;
  lastPingAt: string | null;
};

const LIVE_PING_MAX_AGE_MS = 6 * 60 * 1000;
const STALE_PING_MS = 30 * 60 * 1000;

export function isRecentEldPing(lastPingAt: string | null, nowMs = Date.now()): boolean {
  if (!lastPingAt) return false;
  const t = new Date(lastPingAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t <= LIVE_PING_MAX_AGE_MS;
}

export function minutesSincePing(lastPingAt: string | null, nowMs = Date.now()): number | null {
  if (!lastPingAt) return null;
  const t = new Date(lastPingAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((nowMs - t) / 60_000);
}

export function isStaleTruckPing(lastPingAt: string | null, nowMs = Date.now()): boolean {
  if (!lastPingAt) return true;
  const t = new Date(lastPingAt).getTime();
  if (Number.isNaN(t)) return true;
  return nowMs - t > STALE_PING_MS;
}

/** Carriers the dispatcher may show on the live map (magic-link handshake completed). */
export function dispatcherEldHandshakeCarrierIds(carriers: Carrier[]): Set<string> {
  return new Set(
    carriers
      .filter((c) => c.eld_handshake_completed_at != null && c.eld_handshake_completed_at !== "")
      .map((c) => c.id)
  );
}

/** Prefer telematics `current_*`; fall back to `last_lat` / `last_lng`. */
export function truckMapCoords(truck: Truck): { lat: number; lng: number } | null {
  const lat = truck.current_latitude ?? truck.last_lat;
  const lng = truck.current_longitude ?? truck.last_lng;
  if (lat == null || lng == null) return null;
  const ln = Number(lat);
  const le = Number(lng);
  if (!Number.isFinite(ln) || !Number.isFinite(le)) return null;
  return { lat: ln, lng: le };
}

/**
 * Trucks for one carrier: ELD-linked carriers prefer `eld` source marker styling.
 */
export function fetchTruckPositionsForCarrier(params: {
  trucks: Truck[];
  eldConnections: EldConnection[];
  carrierId: string;
  /** When set (dispatcher), hide fleet until magic-link handshake is done. */
  dispatcherHandshakeIds?: Set<string> | null;
}): TruckMapPing[] {
  const { trucks, eldConnections, carrierId, dispatcherHandshakeIds } = params;
  const scoped = trucks.filter((t) => t.carrier_id === carrierId);
  const hasEld = eldConnections.some((c) => c.carrier_id === carrierId);
  const handshakeOk =
    dispatcherHandshakeIds == null || dispatcherHandshakeIds.has(carrierId);

  if (!handshakeOk) {
    return [];
  }

  const pings: TruckMapPing[] = [];
  for (const truck of scoped) {
    const c = truckMapCoords(truck);
    if (!c) continue;
    pings.push({
      truck,
      lng: c.lng,
      lat: c.lat,
      source: hasEld ? "eld" : "db",
      carrierHasEld: hasEld,
      lastPingAt: truck.last_ping_at ?? null,
    });
  }
  return pings;
}

/**
 * Dispatcher: trucks on carriers that have ELD data, handshake, and live vault row.
 */
export function fetchTruckPositionsAllEldCarriers(params: {
  trucks: Truck[];
  eldConnections: EldConnection[];
  handshakeCarrierIds: Set<string>;
}): TruckMapPing[] {
  const { trucks, eldConnections, handshakeCarrierIds } = params;
  const eldCarriers = new Set(eldConnections.map((e) => e.carrier_id));

  const pings: TruckMapPing[] = [];
  for (const truck of trucks) {
    if (!eldCarriers.has(truck.carrier_id)) continue;
    if (!handshakeCarrierIds.has(truck.carrier_id)) continue;
    const c = truckMapCoords(truck);
    if (!c) continue;
    pings.push({
      truck,
      lng: c.lng,
      lat: c.lat,
      source: "eld",
      carrierHasEld: true,
      lastPingAt: truck.last_ping_at ?? null,
    });
  }
  return pings;
}
