export type MotiveVehiclePing = {
  externalId: string;
  unitNumber: string | null;
  lat: number;
  lng: number;
};

/**
 * Motive Fleet API — vehicle locations (Bearer access token).
 * @see https://developer.gomotive.com/reference/fetch-a-list-of-all-the-vehicles-and-their-locations
 */
export async function fetchMotiveVehicleLocations(
  accessToken: string
): Promise<{ status: number; pings: MotiveVehiclePing[] }> {
  const url =
    "https://api.gomotive.com/v1/vehicle_locations?per_page=200";
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return { status: res.status, pings: [] };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { status: res.status, pings: [] };
  }

  const root = data as Record<string, unknown>;
  const raw =
    (root.vehicle_locations as unknown[]) ??
    (root.data as unknown[]) ??
    (root.vehicles as unknown[]) ??
    (Array.isArray(data) ? data : []);

  const out: MotiveVehiclePing[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const vehicle = (o.vehicle as Record<string, unknown> | undefined) ?? o;
    const idRaw =
      vehicle.id ??
      vehicle.vehicle_id ??
      o.vehicle_id ??
      o.id;
    if (idRaw == null) continue;
    const externalId = String(idRaw);

    const unitRaw =
      vehicle.number ??
      vehicle.unit_number ??
      o.number ??
      o.unit_number;
    const unitNumber =
      unitRaw != null && String(unitRaw).trim() !== ""
        ? String(unitRaw).trim()
        : null;

    const loc =
      (o.current_location as Record<string, unknown> | undefined) ??
      (o.location as Record<string, unknown> | undefined) ??
      o;
    const lat = pickNumber(loc?.lat, loc?.latitude);
    const lng = pickNumber(loc?.lon, loc?.longitude, loc?.lng);
    if (lat == null || lng == null) continue;

    out.push({ externalId, unitNumber, lat, lng });
  }

  return { status: res.status, pings: out };
}

function pickNumber(
  ...vals: Array<unknown>
): number | null {
  for (const v of vals) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
