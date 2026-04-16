import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

/** Subset of `loads` the driver app needs (matches PostgREST row shape). */
export type DriverLoadRow = {
  id: string;
  org_id: string;
  carrier_id: string;
  driver_id: string | null;
  origin: string;
  destination: string;
  rate_cents: number;
  status: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  pickup_location_name?: string | null;
  pickup_address?: string | null;
  pickup_date?: string | null;
  pickup_time_window?: string | null;
  delivery_location_name?: string | null;
  delivery_address?: string | null;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  commodities?: string | null;
  weight_lbs?: number | null;
  special_instructions?: string | null;
  updated_at?: string | null;
  driver_milestone_pickup_at?: string | null;
  driver_milestone_loaded_at?: string | null;
  driver_milestone_delivery_at?: string | null;
  driver_milestone_bol_at?: string | null;
  bol_storage_path?: string | null;
};

const LOAD_SELECT =
  "id, org_id, carrier_id, driver_id, origin, destination, rate_cents, status, dispatched_at, delivered_at, pickup_location_name, pickup_address, pickup_date, pickup_time_window, delivery_location_name, delivery_address, delivery_date, delivery_time_window, commodities, weight_lbs, special_instructions, updated_at, driver_milestone_pickup_at, driver_milestone_loaded_at, driver_milestone_delivery_at, driver_milestone_bol_at, bol_storage_path";

const ACTIVE_STATUSES = ["dispatched", "notification_sent", "in_transit"] as const;
const PAST_STATUSES = ["delivered", "cancelled"] as const;

/** Active + past loads for the signed-in driver (parallel fetch). */
export function useDriverLoadsList(driverId: string | undefined) {
  const [activeLoads, setActiveLoads] = useState<DriverLoadRow[]>([]);
  const [pastLoads, setPastLoads] = useState<DriverLoadRow[]>([]);
  const [loading, setLoading] = useState(!!driverId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!driverId) {
      setActiveLoads([]);
      setPastLoads([]);
      setLoading(false);
      return;
    }
    const client = getSupabase();
    if (!client) return;
    setLoading(true);
    setError(null);

    const [aRes, pRes] = await Promise.all([
      client
        .from("loads")
        .select(LOAD_SELECT)
        .eq("driver_id", driverId)
        .in("status", [...ACTIVE_STATUSES])
        .order("updated_at", { ascending: false }),
      client
        .from("loads")
        .select(LOAD_SELECT)
        .eq("driver_id", driverId)
        .in("status", [...PAST_STATUSES])
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);

    const err = aRes.error ?? pRes.error;
    if (err) setError(err.message);
    setActiveLoads((aRes.data as DriverLoadRow[]) ?? []);
    setPastLoads((pRes.data as DriverLoadRow[]) ?? []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activeLoads, pastLoads, loading, error, refresh };
}
