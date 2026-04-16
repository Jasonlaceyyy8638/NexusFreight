import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

export type CarrierBrief = {
  id: string;
  name: string;
  contact_email: string | null;
};

export type DriverBrief = {
  id: string;
  org_id: string;
  carrier_id: string;
  full_name: string;
  phone: string | null;
};

export function useCurrentDriver(authUserId: string | undefined) {
  const [driver, setDriver] = useState<DriverBrief | null>(null);
  const [carrier, setCarrier] = useState<CarrierBrief | null>(null);
  const [loading, setLoading] = useState(!!authUserId);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authUserId) {
      setDriver(null);
      setCarrier(null);
      setLoading(false);
      setError(null);
      return;
    }
    const client = getSupabase();
    if (!client) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: d, error: dErr } = await client
      .from("drivers")
      .select("id, org_id, carrier_id, full_name, phone")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (dErr) {
      setError(dErr.message);
      setDriver(null);
      setCarrier(null);
      setLoading(false);
      return;
    }
    if (!d) {
      setDriver(null);
      setCarrier(null);
      setLoading(false);
      return;
    }

    setDriver(d as DriverBrief);
    const { data: c, error: cErr } = await client
      .from("carriers")
      .select("id, name, contact_email")
      .eq("id", d.carrier_id)
      .maybeSingle();

    if (cErr) setError(cErr.message);
    setCarrier((c as CarrierBrief) ?? null);
    setLoading(false);
  }, [authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { driver, carrier, loading, error, refresh };
}
