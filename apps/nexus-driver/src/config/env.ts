/**
 * Public config baked at bundle time (see babel.config.js + .env).
 * Copy values from repo root `.env.local` into `apps/nexus-driver/.env` for local builds.
 */
import {
  EXPO_PUBLIC_SITE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_URL,
} from "@env";

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

export function getSupabaseUrl(): string {
  return trim(EXPO_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return trim(EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSiteUrl(): string {
  const s = trim(EXPO_PUBLIC_SITE_URL);
  return (s || "https://nexusfreight.tech").replace(/\/$/, "");
}

export function getPasswordResetRedirectUrl(): string {
  return `${getSiteUrl()}/auth/reset-password`;
}
