import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { useDriverLocation } from "./src/hooks/useDriverLocation";
import { useExpoPushToken } from "./src/hooks/useExpoPushToken";
import { getSupabase } from "./src/lib/supabase";
import { syncDriverPresence } from "./src/sync/presence";

export default function App() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  const { permission, sample, error: locError, refresh } = useDriverLocation();
  const { token: pushToken, error: pushError } = useExpoPushToken();

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    const client = getSupabase();
    if (!client) return;
    setAuthError(null);
    setAuthBusy(true);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    const client = getSupabase();
    if (!client) return;
    setAuthBusy(true);
    try {
      await client.auth.signOut();
    } finally {
      setAuthBusy(false);
    }
  }

  async function refreshLocationAndSync() {
    const client = getSupabase();
    if (!client || !session) {
      setSyncHint("Sign in first.");
      return;
    }
    setSyncBusy(true);
    setSyncHint(null);
    try {
      const coords = await refresh();
      if (!coords) {
        setSyncHint("No GPS fix.");
        return;
      }
      const res = await syncDriverPresence(
        client,
        session,
        {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracyM: coords.accuracy,
        },
        pushToken
      );
      if (!res.ok) {
        setSyncHint(res.message ?? res.reason);
        return;
      }
      setSyncHint("Synced to dispatch map.");
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Nexus Driver</Text>
        <Text style={styles.sub}>
          Sign in with a roster user that has auth linked, then refresh location
          to update the live map and register push.
        </Text>

        {!supabase ? (
          <View style={styles.card}>
            <Text style={styles.warn}>
              Copy your web app env: create apps/nexus-driver/.env with
              EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (same
              values as NEXT_PUBLIC_* in the Next.js project).
            </Text>
          </View>
        ) : !session ? (
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="driver@example.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              editable={!authBusy}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              editable={!authBusy}
            />
            {authError ? (
              <Text style={styles.errText}>{authError}</Text>
            ) : null}
            <Pressable
              style={[styles.button, authBusy && styles.buttonDisabled]}
              onPress={() => void signIn()}
              disabled={authBusy}
            >
              {authBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.signed}>
              Signed in as {session.user.email ?? session.user.id}
            </Text>
            <Pressable
              style={[styles.buttonSecondary, authBusy && styles.buttonDisabled]}
              onPress={() => void signOut()}
              disabled={authBusy}
            >
              <Text style={styles.buttonSecondaryText}>Sign out</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location (live map)</Text>
          <Text style={styles.meta}>
            Permission: {permission ?? "unknown"}
            {locError ? ` — ${locError}` : ""}
          </Text>
          {sample ? (
            <Text style={styles.mono}>
              {sample.latitude.toFixed(5)}, {sample.longitude.toFixed(5)}
              {sample.accuracy != null
                ? ` (±${Math.round(sample.accuracy)}m)`
                : ""}
            </Text>
          ) : (
            <Text style={styles.meta}>No fix yet.</Text>
          )}
          <Pressable
            style={[styles.button, syncBusy && styles.buttonDisabled]}
            onPress={() => void refreshLocationAndSync()}
            disabled={syncBusy}
          >
            {syncBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Refresh & sync to map</Text>
            )}
          </Pressable>
          {syncHint ? (
            <Text style={styles.syncHint}>{syncHint}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Push (new load)</Text>
          <Text style={styles.meta}>
            {pushError
              ? pushError
              : pushToken
                ? "Token is registered when you sync (above)."
                : "Requesting…"}
          </Text>
          {pushToken ? (
            <Text selectable style={styles.monoSmall}>
              {pushToken}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0b0d",
  },
  scroll: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  sub: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#121416",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 10,
  },
  warn: {
    color: "#fbbf24",
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0f1012",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "500",
  },
  signed: {
    color: "#e2e8f0",
    fontSize: 15,
  },
  errText: {
    color: "#f87171",
    fontSize: 14,
  },
  syncHint: {
    fontSize: 13,
    color: "#86efac",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  meta: {
    fontSize: 13,
    color: "#94a3b8",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 14,
    color: "#cbd5e1",
  },
  monoSmall: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#64748b",
  },
});
