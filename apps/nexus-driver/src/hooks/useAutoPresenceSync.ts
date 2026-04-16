import NetInfo from "@react-native-community/netinfo";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getLocationSharingEnabled, onLocationSharingChanged } from "../lib/locationSharing";
import { getSupabase } from "../lib/supabase";
import { syncDriverPresence } from "../sync/presence";
import { useDriverLocation } from "./useDriverLocation";
import { useFcmToken } from "./useFcmToken";

type Params = {
  driverId: string;
  session: Session;
  /** Interval between syncs while app is open (ms). Default 60s. */
  intervalMs?: number;
};

export function useAutoPresenceSync({ driverId, session, intervalMs = 60_000 }: Params) {
  const { refresh } = useDriverLocation();
  const { token: pushToken } = useFcmToken();

  const [enabled, setEnabled] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  async function runOnce(): Promise<void> {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;
      const client = getSupabase();
      if (!client) return;
      const coords = await refresh();
      if (!coords) return;
      await syncDriverPresence(
        client,
        session,
        { lat: coords.latitude, lng: coords.longitude, accuracyM: coords.accuracy },
        pushToken
      );
    } finally {
      runningRef.current = false;
    }
  }

  useEffect(() => {
    let alive = true;
    void getLocationSharingEnabled(driverId).then((v) => {
      if (alive) setEnabled(v);
    });
    const sub = onLocationSharingChanged((e) => {
      if (e.driverId === driverId) setEnabled(e.enabled);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [driverId]);

  useEffect(() => {
    function stop() {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }

    function start() {
      stop();
      // Sync immediately, then keep syncing while app stays open.
      void runOnce();
      timerRef.current = setInterval(() => void runOnce(), intervalMs);
    }

    if (!enabled) {
      stop();
      return;
    }

    if (AppState.currentState === "active") {
      start();
    }

    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") start();
      else stop();
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [enabled, intervalMs, pushToken, session.user.id]); // refresh is stable from hook

  return { enabled };
}

