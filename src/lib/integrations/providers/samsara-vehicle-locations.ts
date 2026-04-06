export type SamsaraVehiclePing = {
  externalId: string;
  unitNumber: string | null;
  lat: number;
  lng: number;
};

/**
 * Samsara Cloud API — list vehicles with GPS.
 * @see https://developers.samsara.com/reference/listvehicles
 */
export async function fetchSamsaraVehicleLocations(
  apiToken: string
): Promise<{ status: number; pings: SamsaraVehiclePing[] }> {
  const url = "https://api.samsara.com/fleet/vehicles?limit=500";
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken.trim()}`,
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
  const vehicles =
    (root.data as unknown[]) ??
    (root.vehicles as unknown[]) ??
    (Array.isArray(data) ? data : []);

  const out: SamsaraVehiclePing[] = [];
  for (const item of vehicles) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    if (v.id == null) continue;
    const externalId = String(v.id);

    const name =
      typeof v.name === "string" && v.name.trim() !== ""
        ? v.name.trim()
        : null;

    const gps = v.gps as Record<string, unknown> | undefined;
    const lat = pickNumber(gps?.latitude, gps?.lat);
    const lng = pickNumber(gps?.longitude, gps?.lon, gps?.lng);
    if (lat == null || lng == null) continue;

    out.push({ externalId, unitNumber: name, lat, lng });
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
