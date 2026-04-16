import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  requestFcmTokenSetup,
  requestForegroundLocationAccess,
} from "../lib/driverPermissions";
import { colors } from "../theme";

type Props = {
  onComplete: () => void | Promise<void>;
};

function friendlyPushError(raw: string): string {
  if (
    raw.includes("FirebaseApp") ||
    raw.includes("FCM") ||
    raw.includes("fcm")
  ) {
    return "Push needs Firebase (FCM) configured (google-services.json + rebuild). You can turn this on later; location and loads still work.";
  }
  return raw;
}

export function OnboardingPermissionsScreen({ onComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const [locationLine, setLocationLine] = useState<string | null>(null);
  const [pushLine, setPushLine] = useState<string | null>(null);

  async function allowAccess() {
    setBusy(true);
    setLocationLine(null);
    setPushLine(null);
    try {
      const loc = await requestForegroundLocationAccess();
      setLocationLine(
        loc.granted
          ? "Location allowed — your carrier can see you on the live map after you sync."
          : "Location not allowed — you can enable it later in system Settings."
      );

      const push = await requestFcmTokenSetup();
      if (push.error) {
        setPushLine(friendlyPushError(push.error));
      } else if (push.token) {
        setPushLine(
          "Notifications ready — we can alert you about loads and messages when your carrier sends them."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await onComplete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Allow access</Text>
        <Text style={styles.sub}>
          NexusFreight needs a couple of permissions so dispatch can see where you
          are and reach you when it matters.
        </Text>

        <View style={styles.card}>
          <Text style={styles.bulletTitle}>Location</Text>
          <Text style={styles.bulletBody}>
            Updates your position on the carrier&apos;s live map when you sync
            from the Map tab.
          </Text>
          <Text style={styles.bulletTitle}>Notifications</Text>
          <Text style={styles.bulletBody}>
            Load assignments, updates, and messages from your team — only when
            your carrier sends them.
          </Text>
        </View>

        <Pressable
          style={[styles.primary, busy && styles.primaryDisabled]}
          onPress={() => void allowAccess()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Allow location & notifications</Text>
          )}
        </Pressable>

        {locationLine ? (
          <Text style={styles.statusOk}>{locationLine}</Text>
        ) : null}
        {pushLine ? (
          <Text
            style={
              pushLine.startsWith("Push on Android") ||
              pushLine.includes("not granted") ||
              pushLine.includes("EAS project")
                ? styles.statusWarn
                : styles.statusOk
            }
          >
            {pushLine}
          </Text>
        ) : null}

        <Pressable
          style={[styles.secondary, busy && styles.primaryDisabled]}
          onPress={() => void finish()}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>
            {locationLine || pushLine ? "Continue to app" : "Skip for now"}
          </Text>
        </Pressable>
        <Text style={styles.footer}>
          You can change permissions anytime in your phone Settings. Skipping does
          not sign you out.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 32, gap: 14 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 4,
  },
  bulletBody: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryDisabled: { opacity: 0.65 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  statusOk: { fontSize: 13, color: colors.success, lineHeight: 18 },
  statusWarn: { fontSize: 13, color: colors.warn, lineHeight: 18 },
  footer: { fontSize: 12, color: colors.dim, lineHeight: 18, marginTop: 4 },
});
