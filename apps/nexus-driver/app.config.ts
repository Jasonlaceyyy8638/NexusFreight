import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { ExpoConfig } from "expo/config";

/** Repo root (nexusfreight/), two levels up from apps/nexus-driver. */
const repoRoot = path.resolve(__dirname, "..", "..");
const appDir = __dirname;

/**
 * Expo only auto-loads `.env*` from this app folder. Load monorepo root `.env.local`
 * (Next.js) so `NEXT_PUBLIC_SUPABASE_*` works without duplicating files.
 */
function loadMonorepoEnv(): void {
  const files = [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(appDir, ".env"),
    path.join(appDir, ".env.local"),
  ];
  for (const file of files) {
    if (existsSync(file)) {
      loadEnv({ path: file, override: true });
    }
  }
}

loadMonorepoEnv();

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

/** Must match what you register in Google Play Console and App Store Connect. */
const BUNDLE_ID = "com.nexusfreight.driver";

const config: ExpoConfig = {
  name: "Nexus Driver",
  slug: "nexus-driver",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  /** Off in Expo Go: New Arch + ScrollView TextInput often drops focus / blocks typing on some devices. */
  newArchEnabled: false,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0b0d",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    infoPlist: {
      UIBackgroundModes: ["location"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0a0b0d",
    },
    package: BUNDLE_ID,
  },
  plugins: [
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Nexus Freight uses your location to show your position on the live map while you are on a load.",
        isAndroidBackgroundLocationEnabled: true,
        locationAlwaysPermission:
          "Background location keeps your position updated on the map while you are driving.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#0a0b0d",
      },
    ],
  ],
  extra: {
    supabaseUrl,
    supabaseAnonKey,
  },
};

export default config;
