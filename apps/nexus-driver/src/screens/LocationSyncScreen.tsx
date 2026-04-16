import type { Session } from "@supabase/supabase-js";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { useFcmToken } from "../hooks/useFcmToken";
import { getSupabase } from "../lib/supabase";
import { syncDriverPresence } from "../sync/presence";
import { colors } from "../theme";

type Props = {
  session: Session;
};

export function LocationSyncScreen({ session }: Props) {
  const { permission, sample, error: locError, refresh } = useDriverLocation();
  const { token: pushToken, error: pushError } = useFcmToken();
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  async function refreshLocationAndSync() {
    const client = getSupabase();
    if (!client) {
      setSyncHint("Supabase not configured.");
      return;
    }
    setSyncBusy(true);
    setSyncHint(null);
    try {
      const coords = await refresh();
      if (!coords) {
        setSyncHint("No GPS fix. On an emulator, set a location under ⋮ → Location.");
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
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Location & map</Text>
      <Text style={styles.sub}>
        If Auto-sync is ON (More tab), your location updates automatically while the app is open.
        You can also tap &quot;Refresh &amp; sync&quot; if dispatch asks for an update right now.
      </Text>

      <View style={styles.card}>
        <Text style={styles.meta}>
          Permission: {permission ?? "unknown"}
          {locError ? ` — ${locError}` : ""}
        </Text>
        {sample ? (
          <Text style={styles.mono}>
            {sample.latitude.toFixed(5)}, {sample.longitude.toFixed(5)}
            {sample.accuracy != null ? ` (±${Math.round(sample.accuracy)}m)` : ""}
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
        {syncHint ? <Text style={styles.hint}>{syncHint}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Push notifications</Text>
        <Text style={styles.meta}>
          {pushError
            ? pushError
            : pushToken
              ? "Ready — dispatch can reach this device for load alerts and messages."
              : "Requesting notification access…"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  mono: { fontFamily: "monospace", fontSize: 14, color: colors.text },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, color: colors.success },
});
