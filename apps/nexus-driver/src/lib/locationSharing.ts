import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { startBackgroundLocationSync, stopBackgroundLocationSync } from "./nativeLocationSync";

const eventName = "nexus_driver_location_sharing_changed";

function storageKey(driverId: string): string {
  return `driver_location_sharing_v1_${driverId}`;
}

export async function getLocationSharingEnabled(driverId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(storageKey(driverId));
  // Default ON (so it "just works" after permissions)
  return v == null ? true : v === "1";
}

export async function setLocationSharingEnabled(
  driverId: string,
  enabled: boolean
): Promise<void> {
  await AsyncStorage.setItem(storageKey(driverId), enabled ? "1" : "0");
  // Start/stop native background sync (Android).
  try {
    if (enabled) await startBackgroundLocationSync();
    else await stopBackgroundLocationSync();
  } catch {
    // ignore (module may be unavailable in dev)
  }
  DeviceEventEmitter.emit(eventName, { driverId, enabled });
}

export function onLocationSharingChanged(
  handler: (e: { driverId: string; enabled: boolean }) => void
): { remove: () => void } {
  const sub = DeviceEventEmitter.addListener(eventName, handler);
  return { remove: () => sub.remove() };
}

