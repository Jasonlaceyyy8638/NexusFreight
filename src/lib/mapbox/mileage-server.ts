import { calculateRouteMiles } from "@/lib/maps";

export type MileageResult = {
  deadheadMiles: number;
  loadedMiles: number;
};

/**
 * Deadhead: driver/truck position → pickup (origin).
 * Loaded: origin → destination.
 * Uses Mapbox `driving-traffic` via @/lib/maps.
 */
export async function computeLaneMileage(input: {
  originAddress: string;
  destinationAddress: string;
  fromLng?: number | null;
  fromLat?: number | null;
}): Promise<{ ok: true; miles: MileageResult } | { ok: false; error: string }> {
  const loaded = await calculateRouteMiles(
    { address: input.originAddress },
    { address: input.destinationAddress }
  );
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  let deadheadMiles = 0;
  if (
    input.fromLng != null &&
    input.fromLat != null &&
    !Number.isNaN(Number(input.fromLng)) &&
    !Number.isNaN(Number(input.fromLat))
  ) {
    const dh = await calculateRouteMiles(
      { lng: Number(input.fromLng), lat: Number(input.fromLat) },
      { address: input.originAddress }
    );
    if (dh.ok) deadheadMiles = Math.max(0, dh.miles);
  }

  return {
    ok: true,
    miles: { deadheadMiles, loadedMiles: Math.max(0, loaded.miles) },
  };
}
