import { useCallback, useEffect, useState } from "react";
import type { DriverLoadRow } from "./useDriverLoads";
import { getSupabase } from "../lib/supabase";

const LOAD_SELECT =
  "id, org_id, carrier_id, driver_id, origin, destination, rate_cents, status, dispatched_at, delivered_at, pickup_location_name, pickup_address, pickup_date, pickup_time_window, delivery_location_name, delivery_address, delivery_date, delivery_time_window, commodities, weight_lbs, special_instructions, updated_at, driver_milestone_pickup_at, driver_milestone_loaded_at, driver_milestone_delivery_at, driver_milestone_bol_at, bol_storage_path";

export function useLoadDetail(loadId: string | undefined, driverId: string | undefined) {
  const [load, setLoad] = useState<DriverLoadRow | null>(null);
  const [loading, setLoading] = useState(!!loadId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!loadId || !driverId) {
      setLoad(null);
      setLoading(false);
      return;
    }
    const client = getSupabase();
    if (!client) return;
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await client
      .from("loads")
      .select(LOAD_SELECT)
      .eq("id", loadId)
      .eq("driver_id", driverId)
      .maybeSingle();

    if (qErr) {
      setError(qErr.message);
      setLoad(null);
    } else {
      setLoad((data as DriverLoadRow) ?? null);
      if (!data) setError("Load not found or not assigned to you.");
    }
    setLoading(false);
  }, [loadId, driverId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { load, loading, error, refresh };
}
