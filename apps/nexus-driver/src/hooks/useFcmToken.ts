import messaging from "@react-native-firebase/messaging";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { requestFcmTokenSetup } from "../lib/driverPermissions";

/**
 * FCM token for dispatch push. Stored server-side; use FCM HTTP v1 to send (not Expo Push API).
 */
export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token: t, error: err } = await requestFcmTokenSetup();
      if (!cancelled) {
        setToken(t);
        setError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const unsub = messaging().onTokenRefresh((t) => setToken(t));
    return () => unsub();
  }, []);

  return { token, error };
}
