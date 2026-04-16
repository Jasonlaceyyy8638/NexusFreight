import { NativeModules, Platform } from "react-native";

type LocationSyncModule = {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
};

function mod(): LocationSyncModule | null {
  const m = NativeModules.LocationSync as LocationSyncModule | undefined;
  return m ?? null;
}

export async function startBackgroundLocationSync(): Promise<void> {
  if (Platform.OS !== "android") return;
  const m = mod();
  if (!m) return;
  await m.start();
}

export async function stopBackgroundLocationSync(): Promise<void> {
  if (Platform.OS !== "android") return;
  const m = mod();
  if (!m) return;
  await m.stop();
}

