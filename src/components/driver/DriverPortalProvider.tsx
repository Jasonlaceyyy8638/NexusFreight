"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Load } from "@/types/database";

type DriverProfileRow = {
  org_id: string;
  full_name: string | null;
  phone: string | null;
  phone_number: string | null;
};

type DriverPortalContextValue = {
  loading: boolean;
  orgId: string | null;
  driverId: string | null;
  profile: DriverProfileRow | null;
  activeLoad: Load | null;
  historyLoads: Load[];
  refresh: () => Promise<void>;
};

const DriverPortalContext = createContext<DriverPortalContextValue | null>(
  null
);

const ACTIVE_STATUSES = [
  "dispatched",
  "notification_sent",
  "in_transit",
] as const;

export function DriverPortalProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skip = pathname === "/driver/desktop-only";
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(!skip);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DriverProfileRow | null>(null);
  const [activeLoad, setActiveLoad] = useState<Load | null>(null);
  const [historyLoads, setHistoryLoads] = useState<Load[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setOrgId(null);
      setDriverId(null);
      setProfile(null);
      setActiveLoad(null);
      setHistoryLoads([]);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setOrgId(null);
      setDriverId(null);
      setProfile(null);
      setActiveLoad(null);
      setHistoryLoads([]);
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("org_id, full_name, phone, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    const p = prof as DriverProfileRow | null;
    setProfile(p);
    setOrgId(p?.org_id ?? null);

    const { data: driverRow } = await supabase
      .from("drivers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const dId = driverRow?.id ?? null;
    setDriverId(dId);

    if (!dId) {
      setActiveLoad(null);
      setHistoryLoads([]);
      return;
    }

    const { data: activeRows } = await supabase
      .from("loads")
      .select("*")
      .eq("driver_id", dId)
      .in("status", [...ACTIVE_STATUSES])
      .order("dispatched_at", { ascending: false, nullsFirst: false })
      .limit(1);

    setActiveLoad((activeRows?.[0] as Load) ?? null);

    const { data: hist } = await supabase
      .from("loads")
      .select("*")
      .eq("driver_id", dId)
      .in("status", ["delivered", "cancelled"])
      .order("delivered_at", { ascending: false, nullsFirst: false })
      .limit(50);

    setHistoryLoads((hist as Load[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, skip]);

  useEffect(() => {
    if (skip || !supabase || !driverId) return;
    const filter = `driver_id=eq.${driverId}`;
    const channel = supabase
      .channel(`loads-driver-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loads",
          filter,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [skip, supabase, driverId, refresh]);

  const value = useMemo<DriverPortalContextValue>(
    () => ({
      loading,
      orgId,
      driverId,
      profile,
      activeLoad,
      historyLoads,
      refresh,
    }),
    [loading, orgId, driverId, profile, activeLoad, historyLoads, refresh]
  );

  return (
    <DriverPortalContext.Provider value={value}>
      {children}
    </DriverPortalContext.Provider>
  );
}

export function useDriverPortal() {
  const ctx = useContext(DriverPortalContext);
  if (!ctx) {
    throw new Error("useDriverPortal must be used within DriverPortalProvider");
  }
  return ctx;
}
