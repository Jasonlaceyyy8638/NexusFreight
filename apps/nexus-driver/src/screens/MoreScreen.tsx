import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  getLocationSharingEnabled,
  setLocationSharingEnabled,
} from "../lib/locationSharing";
import { getPublicSiteUrl } from "../lib/site";
import { getSupabase } from "../lib/supabase";
import type { CarrierBrief, DriverBrief } from "../hooks/useCurrentDriver";
import { colors } from "../theme";

type DispatcherRow = {
  full_name: string | null;
  phone_number: string | null;
  phone: string | null;
};

type Props = {
  driver: DriverBrief;
  carrier: CarrierBrief | null;
  onSignOut: () => void;
};

export function MoreScreen({ driver, carrier, onSignOut }: Props) {
  const [dispatchers, setDispatchers] = useState<DispatcherRow[]>([]);
  const [shareLocation, setShareLocation] = useState<boolean>(true);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void client
      .from("profiles")
      .select("full_name, phone_number, phone")
      .eq("org_id", driver.org_id)
      .eq("role", "Dispatcher")
      .order("full_name")
      .then(({ data }) => {
        setDispatchers((data as DispatcherRow[]) ?? []);
      });
  }, [driver.org_id]);

  useEffect(() => {
    let alive = true;
    void getLocationSharingEnabled(driver.id).then((v) => {
      if (alive) setShareLocation(v);
    });
    return () => {
      alive = false;
    };
  }, [driver.id]);

  const primaryDispatchPhone = useMemo(() => {
    for (const d of dispatchers) {
      const tel = d.phone_number ?? d.phone;
      if (tel?.trim()) return tel.trim();
    }
    return null;
  }, [dispatchers]);

  function openPrivacy() {
    void Linking.openURL(`${getPublicSiteUrl()}/privacy`);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{driver.full_name}</Text>
      <Text style={styles.meta}>
        {carrier?.name ?? "Carrier"}
        {driver.phone ? ` · ${driver.phone}` : ""}
      </Text>

      <Text style={styles.section}>Get help</Text>
      <View style={styles.card}>
        <Text style={styles.helpLead}>
          Questions about your load, pickup, or delivery? Reach your dispatcher or
          carrier office.
        </Text>
        {primaryDispatchPhone ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void Linking.openURL(`tel:${primaryDispatchPhone}`)}
          >
            <Ionicons name="call" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}> Call dispatch</Text>
          </Pressable>
        ) : null}
        {primaryDispatchPhone ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              const body = encodeURIComponent(
                `Hi, this is ${driver.full_name} — `
              );
              const sep = Platform.OS === "ios" ? "&" : "?";
              void Linking.openURL(
                `sms:${primaryDispatchPhone}${sep}body=${body}`
              );
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryBtnText}> Text dispatch</Text>
          </Pressable>
        ) : null}
        {carrier?.contact_email ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              void Linking.openURL(`mailto:${carrier.contact_email}`)
            }
          >
            <Ionicons name="mail-outline" size={20} color={colors.accent} />
            <Text style={styles.secondaryBtnText}> Email carrier</Text>
          </Pressable>
        ) : null}
        {!primaryDispatchPhone && !carrier?.contact_email ? (
          <Text style={styles.dim}>
            Your carrier hasn&apos;t added dispatch phone or email yet. Ask them to
            update carrier contact info in NexusFreight.
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>Location sharing</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.body}>Auto-sync location</Text>
            <Text style={styles.dim}>
              When ON, your location is sent to dispatch automatically while the app is open.
            </Text>
          </View>
          <Switch
            value={shareLocation}
            onValueChange={(v) => {
              setShareLocation(v);
              void setLocationSharingEnabled(driver.id, v);
            }}
            thumbColor={shareLocation ? "#fff" : "#fff"}
            trackColor={{ false: "rgba(255,255,255,0.18)", true: colors.accent }}
          />
        </View>
      </View>

      <Text style={styles.section}>Dispatch directory</Text>
      <View style={styles.card}>
        {carrier?.contact_email ? (
          <Pressable
            style={styles.row}
            onPress={() =>
              void Linking.openURL(`mailto:${carrier.contact_email}`)
            }
          >
            <Text style={styles.rowLabel}>Carrier email</Text>
            <Text style={styles.link}>{carrier.contact_email}</Text>
          </Pressable>
        ) : (
          <Text style={styles.dim}>No carrier contact email on file.</Text>
        )}
        {dispatchers.length > 0 ? (
          <>
            <Text style={styles.subhead}>Dispatch team</Text>
            {dispatchers.map((d, i) => {
              const tel = d.phone_number ?? d.phone;
              return (
                <View key={i} style={styles.dispatcher}>
                  <Text style={styles.body}>{d.full_name ?? "Dispatcher"}</Text>
                  {tel ? (
                    <View style={styles.dispatcherActions}>
                      <Pressable onPress={() => void Linking.openURL(`tel:${tel}`)}>
                        <Text style={styles.link}>Call</Text>
                      </Pressable>
                      <Text style={styles.sep}> · </Text>
                      <Pressable onPress={() => void Linking.openURL(`sms:${tel}`)}>
                        <Text style={styles.link}>Text</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.dim}>No phone on file</Text>
                  )}
                </View>
              );
            })}
          </>
        ) : null}
      </View>

      <Text style={styles.section}>Legal & account</Text>
      <View style={styles.card}>
        <Pressable style={styles.rowPress} onPress={() => void openPrivacy()}>
          <Ionicons name="document-text-outline" size={20} color={colors.muted} />
          <Text style={styles.rowPressText}>Privacy policy</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.dim} />
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={onSignOut}>
          <Text style={styles.outlineText}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  section: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  helpLead: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingVertical: 12,
  },
  secondaryBtnText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  row: { gap: 4 },
  rowLabel: { fontSize: 12, color: colors.dim, textTransform: "uppercase" },
  link: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  dim: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  subhead: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 8 },
  body: { fontSize: 15, color: colors.text },
  dispatcher: { gap: 4, marginTop: 4 },
  dispatcherActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  sep: { color: colors.dim },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  rowPressText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  outlineText: { color: colors.text, fontSize: 16, fontWeight: "600" },
});
