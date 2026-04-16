import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";
import {
  check,
  PERMISSIONS,
  request,
  RESULTS,
  type Permission,
} from "react-native-permissions";

function locationPermission(): Permission {
  return Platform.OS === "ios"
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
}

/**
 * Foreground location — used for live map / presence sync.
 */
export async function requestForegroundLocationAccess(): Promise<{
  granted: boolean;
  status: string;
  label: string;
}> {
  const perm = locationPermission();
  let r = await check(perm);
  if (r !== RESULTS.GRANTED) {
    r = await request(perm);
  }
  const granted = r === RESULTS.GRANTED;
  let label = "Not determined";
  if (granted) label = "Allowed";
  else if (r === RESULTS.DENIED) label = "Denied";
  return { granted, status: r, label };
}

async function ensureAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (typeof Platform.Version === "number" && Platform.Version < 33) {
    return true;
  }
  const res = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * FCM device token (stored in `driver_push_tokens.expo_push_token` for compatibility).
 * Server-side pushes must use **FCM HTTP v1**, not Expo Push API.
 */
export async function requestFcmTokenSetup(): Promise<{
  token: string | null;
  error: string | null;
}> {
  try {
    if (Platform.OS === "ios") {
      const authStatus = await messaging().requestPermission();
      const ok =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!ok) {
        return { token: null, error: "Notification permission not granted." };
      }
    } else {
      const ok = await ensureAndroidNotificationPermission();
      if (!ok) {
        return { token: null, error: "Notification permission not granted." };
      }
    }

    const t = await messaging().getToken();
    return { token: t || null, error: null };
  } catch (e) {
    return {
      token: null,
      error: e instanceof Error ? e.message : "Push token error",
    };
  }
}
