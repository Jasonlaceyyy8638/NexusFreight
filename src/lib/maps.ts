/**
 * Mapbox Directions API — mileage engine (server or secure contexts).
 * Uses `driving-traffic` for route distance consistent with live traffic routing.
 */

import { resolveMapboxTokenFromProcessEnv } from "@/lib/mapbox/resolve-mapbox-env";

export type MapCoord = { lng: number; lat: number };

export type MapRouteEndpoint =
  | MapCoord
  | { address: string };

function isCoord(p: MapRouteEndpoint): p is MapCoord {
  return "lng" in p && "lat" in p;
}

async function geocodeAddress(
  address: string,
  token: string
): Promise<MapCoord | null> {
  const q = encodeURIComponent(address.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${token}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ center?: [number, number] }>;
  };
  const c = data.features?.[0]?.center;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1] };
}

async function resolveEndpoint(
  p: MapRouteEndpoint,
  token: string
): Promise<MapCoord | null> {
  if (isCoord(p)) {
    if (
      Number.isNaN(p.lng) ||
      Number.isNaN(p.lat) ||
      p.lng < -180 ||
      p.lng > 180 ||
      p.lat < -90 ||
      p.lat > 90
    ) {
      return null;
    }
    return p;
  }
  return geocodeAddress(p.address, token);
}

/** Convert Mapbox route distance (meters) to statute miles. */
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/**
 * Total driving distance in miles between two endpoints using `driving-traffic`.
 * Each endpoint may be coordinates or a free-text address (geocoded first).
 */
export async function calculateRouteMiles(
  origin: MapRouteEndpoint,
  destination: MapRouteEndpoint
): Promise<{ ok: true; miles: number } | { ok: false; error: string }> {
  const token = resolveMapboxTokenFromProcessEnv().trim();
  if (!token) {
    return { ok: false, error: "Mapbox token is not configured." };
  }

  const [a, b] = await Promise.all([
    resolveEndpoint(origin, token),
    resolveEndpoint(destination, token),
  ]);
  if (!a) {
    return { ok: false, error: "Could not resolve origin for routing." };
  }
  if (!b) {
    return { ok: false, error: "Could not resolve destination for routing." };
  }

  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${token}&overview=false`;
  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, error: "Mapbox directions request failed." };
  }
  const data = (await res.json()) as {
    routes?: Array<{ distance?: number }>;
    message?: string;
  };
  const meters = data.routes?.[0]?.distance;
  if (meters == null || Number.isNaN(meters)) {
    return {
      ok: false,
      error: data.message ?? "No route distance returned.",
    };
  }
  return { ok: true, miles: Math.max(0, metersToMiles(meters)) };
}
