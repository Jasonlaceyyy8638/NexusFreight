import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

export type SyncPresenceResult =
  | { ok: true }
  | {
      ok: false;
      reason: "no_driver_row" | "location_error" | "push_error";
      message?: string;
    };

/**
 * Upsert latest GPS + device push token (FCM) for this driver (RLS: roster `auth_user_id` must match session).
 */
export async function syncDriverPresence(
  client: SupabaseClient,
  session: Session,
  coords: { lat: number; lng: number; accuracyM: number | null },
  /** FCM token (or legacy Expo token); stored in `expo_push_token` column. */
  devicePushToken: string | null
): Promise<SyncPresenceResult> {
  const { data: driver, error: dErr } = await client
    .from("drivers")
    .select("id, org_id, carrier_id")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (dErr || !driver) {
    return {
      ok: false,
      reason: "no_driver_row",
      message: dErr?.message ?? "Link this login to a driver on the roster (auth_user_id).",
    };
  }

  const now = new Date().toISOString();
  const { error: locErr } = await client.from("driver_locations").upsert(
    {
      driver_id: driver.id,
      org_id: driver.org_id,
      carrier_id: driver.carrier_id,
      lat: coords.lat,
      lng: coords.lng,
      accuracy_m: coords.accuracyM,
      recorded_at: now,
      updated_at: now,
    },
    { onConflict: "driver_id" }
  );

  if (locErr) {
    return { ok: false, reason: "location_error", message: locErr.message };
  }

  if (devicePushToken) {
    const platform = Platform.OS === "ios" ? "ios" : "android";
    const { error: tokErr } = await client.from("driver_push_tokens").upsert(
      {
        user_id: session.user.id,
        driver_id: driver.id,
        expo_push_token: devicePushToken,
        platform,
        updated_at: now,
      },
      { onConflict: "expo_push_token" }
    );
    if (tokErr) {
      return { ok: false, reason: "push_error", message: tokErr.message };
    }
  }

  return { ok: true };
}
