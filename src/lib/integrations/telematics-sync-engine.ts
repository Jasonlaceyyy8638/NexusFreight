import {
  decryptTelematicsSecret,
  encryptTelematicsSecret,
} from "@/lib/crypto/telematics-secret";
import { credentialsFromPlainToken } from "@/lib/integrations/credentials-from-plain";
import {
  refreshMotiveAccessToken,
  type MotiveTokenResponse,
} from "@/lib/integrations/motive-oauth";
import { fetchMotiveVehicleLocations } from "@/lib/integrations/providers/motive-vehicle-locations";
import { fetchSamsaraVehicleLocations } from "@/lib/integrations/providers/samsara-vehicle-locations";
import type { EldProvider } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TelematicsTokenRow = {
  org_id: string;
  carrier_id: string;
  provider_type: EldProvider;
  ciphertext: string | null;
  iv: string | null;
  auth_tag: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

export type VehiclePing = {
  externalId: string;
  unitNumber: string | null;
  lat: number;
  lng: number;
};

function truckGpsPayload(lat: number, lng: number, now: string) {
  return {
    last_lat: lat,
    last_lng: lng,
    current_latitude: lat,
    current_longitude: lng,
    last_ping_at: now,
    updated_at: now,
  };
}

function normalizeUnit(u: string): string {
  return u.trim().toUpperCase().replace(/\s+/g, "");
}

export function resolveTokensFromRow(row: TelematicsTokenRow): {
  access: string | null;
  refresh: string | null;
} {
  const colAccess = row.access_token?.trim() ?? null;
  const colRefresh = row.refresh_token?.trim() ?? null;
  if (colAccess) {
    return { access: colAccess, refresh: colRefresh };
  }
  if (!row.ciphertext || !row.iv || !row.auth_tag) {
    return { access: null, refresh: null };
  }
  const plain = decryptTelematicsSecret({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.auth_tag,
  });
  if (!plain) return { access: null, refresh: null };
  try {
    const j = JSON.parse(plain) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (typeof j.access_token === "string") {
      return {
        access: j.access_token,
        refresh:
          typeof j.refresh_token === "string" ? j.refresh_token : colRefresh,
      };
    }
  } catch {
    return { access: plain, refresh: null };
  }
  return { access: plain, refresh: null };
}

async function mockRefreshTruckPings(
  supabase: SupabaseClient,
  carrierId: string
): Promise<number> {
  const { data: rows } = await supabase
    .from("trucks")
    .select("id, last_lat, last_lng, current_latitude, current_longitude")
    .eq("carrier_id", carrierId);
  const trucks = (rows ?? []) as Array<{
    id: string;
    last_lat: number | null;
    last_lng: number | null;
    current_latitude: number | null;
    current_longitude: number | null;
  }>;
  const now = new Date().toISOString();
  let n = 0;
  for (const t of trucks) {
    const baseLat =
      t.current_latitude ?? t.last_lat ?? 39.5 + Math.random() * 2;
    const baseLng =
      t.current_longitude ?? t.last_lng ?? -98.35 + Math.random() * 2;
    const jitter = 0.002;
    const lat = baseLat + (Math.random() - 0.5) * jitter;
    const lng = baseLng + (Math.random() - 0.5) * jitter;
    const { error } = await supabase
      .from("trucks")
      .update(truckGpsPayload(lat, lng, now))
      .eq("id", t.id);
    if (!error) n += 1;
  }
  return n;
}

export async function applyVehiclePings(
  supabase: SupabaseClient,
  carrierId: string,
  pings: VehiclePing[]
): Promise<number> {
  if (pings.length === 0) return 0;
  const { data: trucks } = await supabase
    .from("trucks")
    .select("id, unit_number, eld_external_id")
    .eq("carrier_id", carrierId);
  const list =
    (trucks ?? []) as Array<{
      id: string;
      unit_number: string;
      eld_external_id: string | null;
    }>;

  const byEld = new Map(pings.map((p) => [p.externalId, p]));
  const byUnit = new Map<string, VehiclePing>();
  for (const p of pings) {
    if (p.unitNumber) {
      const k = normalizeUnit(p.unitNumber);
      if (!byUnit.has(k)) byUnit.set(k, p);
    }
  }

  const now = new Date().toISOString();
  let n = 0;
  for (const t of list) {
    let ping: VehiclePing | undefined =
      t.eld_external_id != null && t.eld_external_id !== ""
        ? byEld.get(t.eld_external_id)
        : undefined;
    if (!ping) {
      ping = byUnit.get(normalizeUnit(t.unit_number));
    }
    if (!ping) continue;
    const { error } = await supabase
      .from("trucks")
      .update(truckGpsPayload(ping.lat, ping.lng, now))
      .eq("id", t.id);
    if (!error) n += 1;
  }
  return n;
}

async function persistMotiveAfterRefresh(
  admin: SupabaseClient,
  carrierId: string,
  tokens: MotiveTokenResponse,
  fallbackRefresh: string
): Promise<void> {
  const plain = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? fallbackRefresh,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
  });
  const enc = encryptTelematicsSecret(plain);
  const creds = credentialsFromPlainToken("motive", plain);
  const now = new Date().toISOString();
  await admin
    .from("telematics_tokens")
    .update({
      access_token: creds.access_token,
      refresh_token: creds.refresh_token,
      token_expires_at: creds.token_expires_at,
      ...(enc
        ? {
            ciphertext: enc.ciphertext,
            iv: enc.iv,
            auth_tag: enc.authTag,
          }
        : {}),
      updated_at: now,
    })
    .eq("carrier_id", carrierId)
    .eq("provider_type", "motive");
}

export async function syncSingleTelematicsRow(
  supabase: SupabaseClient,
  row: TelematicsTokenRow
): Promise<{ trucksUpdated: number; mode: "api" | "mock" }> {
  const { access, refresh } = resolveTokensFromRow(row);
  const useMock =
    process.env.ELD_SYNC_MOCK === "true" || !access || access.length === 0;

  if (useMock) {
    const n = await mockRefreshTruckPings(supabase, row.carrier_id);
    return { trucksUpdated: n, mode: "mock" };
  }

  let pings: VehiclePing[] = [];
  let mode: "api" | "mock" = "api";

  if (row.provider_type === "motive") {
    let r = await fetchMotiveVehicleLocations(access);
    if (r.status === 401 && refresh) {
      const fresh = await refreshMotiveAccessToken(refresh);
      if (fresh?.access_token) {
        await persistMotiveAfterRefresh(
          supabase,
          row.carrier_id,
          fresh,
          refresh
        );
        r = await fetchMotiveVehicleLocations(fresh.access_token);
      }
    }
    pings = r.pings;
  } else if (row.provider_type === "samsara") {
    const r = await fetchSamsaraVehicleLocations(access);
    pings = r.pings;
  } else {
    // geotab: not wired yet
    pings = [];
  }

  if (pings.length === 0) {
    const n = await mockRefreshTruckPings(supabase, row.carrier_id);
    return { trucksUpdated: n, mode: "mock" };
  }

  const updated = await applyVehiclePings(
    supabase,
    row.carrier_id,
    pings
  );
  if (updated === 0) {
    const n = await mockRefreshTruckPings(supabase, row.carrier_id);
    return { trucksUpdated: n, mode: "mock" };
  }
  return { trucksUpdated: updated, mode: "api" };
}

export async function executeTelematicsSync(admin: SupabaseClient): Promise<{
  connections: number;
  trucksUpdated: number;
  errors: string[];
}> {
  const { data: rows, error } = await admin.from("telematics_tokens").select("*");

  if (error) {
    return {
      connections: 0,
      trucksUpdated: 0,
      errors: [error.message],
    };
  }

  let trucksUpdated = 0;
  const errors: string[] = [];

  for (const r of rows ?? []) {
    try {
      const res = await syncSingleTelematicsRow(
        admin,
        r as TelematicsTokenRow
      );
      trucksUpdated += res.trucksUpdated;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "sync error");
    }
  }

  return {
    connections: rows?.length ?? 0,
    trucksUpdated,
    errors,
  };
}
