import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return (
    extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Expo push token (dev / EAS builds). Persist server-side; pair with FCM/APNs for production pushes.
 */
export function useExpoPushToken() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          if (!cancelled) setError("Notification permission not granted.");
          return;
        }
        const projectId = resolveEasProjectId();
        if (!projectId) {
          if (!cancelled) {
            setError(
              "Run `npx eas init` in apps/nexus-driver so push has an EAS project id."
            );
          }
          return;
        }
        const t = await Notifications.getExpoPushTokenAsync({ projectId });
        if (!cancelled) setToken(t.data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Push token error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      void Notifications.setNotificationChannelAsync("loads", {
        name: "Load assignments",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3B82F6",
      });
    }
  }, []);

  return { token, error };
}
