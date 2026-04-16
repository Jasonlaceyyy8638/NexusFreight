import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

type SupabaseExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function resolveSupabaseUrl(): string {
  const extra = Constants.expoConfig?.extra as SupabaseExtra | undefined;
  return (
    extra?.supabaseUrl?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

function resolveSupabaseAnonKey(): string {
  const extra = Constants.expoConfig?.extra as SupabaseExtra | undefined;
  return (
    extra?.supabaseAnonKey?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = resolveSupabaseUrl();
  const key = resolveSupabaseAnonKey();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
