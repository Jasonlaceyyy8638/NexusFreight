import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLoadDetail } from "../hooks/useLoadDetail";
import { useLoadMessages } from "../hooks/useLoadMessages";
import { getSupabase } from "../lib/supabase";
import { colors } from "../theme";
import { formatLoadStatus, formatUsd } from "../utils/format";
import type { LoadsStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<LoadsStackParamList, "LoadDetail"> & {
  driverId: string;
};

type MilestoneStep = "pickup_on_site" | "pickup_loaded" | "delivery_arrived" | "bol_signed";

const STEP_LABELS: Record<MilestoneStep, string> = {
  pickup_on_site: "1 · On site at pickup",
  pickup_loaded: "2 · Loaded at shipper",
  delivery_arrived: "3 · On site at delivery",
  bol_signed: "4 · Signed BOL (completes load)",
};

function openMaps(address: string | null | undefined) {
  if (!address?.trim()) return;
  const q = encodeURIComponent(address.trim());
  void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
}

function nextMilestoneStep(load: {
  driver_milestone_pickup_at?: string | null;
  driver_milestone_loaded_at?: string | null;
  driver_milestone_delivery_at?: string | null;
  driver_milestone_bol_at?: string | null;
  status: string;
}): MilestoneStep | null {
  if (load.status === "delivered" || load.status === "cancelled") return null;
  if (!load.driver_milestone_pickup_at) return "pickup_on_site";
  if (!load.driver_milestone_loaded_at) return "pickup_loaded";
  if (!load.driver_milestone_delivery_at) return "delivery_arrived";
  if (!load.driver_milestone_bol_at) return "bol_signed";
  return null;
}

export function LoadDetailScreen({ route, driverId }: Props) {
  const { loadId } = route.params;
  const { load, loading, error, refresh } = useLoadDetail(loadId, driverId);
  const { messages, send } = useLoadMessages(load?.id, load?.org_id);
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [mBusy, setMBusy] = useState(false);
  const [mErr, setMErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const nextStep = useMemo(() => (load ? nextMilestoneStep(load) : null), [load]);

  async function advance(step: MilestoneStep) {
    if (!load) return;
    const client = getSupabase();
    if (!client) return;
    setMBusy(true);
    setMErr(null);
    const { data, error: rpcErr } = await client.rpc("driver_advance_load_milestone", {
      p_load_id: load.id,
      p_step: step,
    });
    setMBusy(false);
    if (rpcErr) {
      setMErr(rpcErr.message);
      return;
    }
    const payload = data as { ok?: boolean; error?: string } | null;
    if (!payload?.ok) {
      setMErr(payload?.error ?? "Could not update step.");
      return;
    }
    await refresh();
  }

  async function onSendMessage() {
    const t = msgText.trim();
    if (!t) return;
    setMsgBusy(true);
    const res = await send(t);
    setMsgBusy(false);
    if (res.ok) setMsgText("");
  }

  if (loading && !load) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !load) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? "Not found."}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.status}>{formatLoadStatus(load.status)}</Text>
          <Text style={styles.linehaul}>{formatUsd(load.rate_cents)} linehaul</Text>
        </View>

        <Text style={styles.section}>Route</Text>
        <Text style={styles.body}>{load.origin}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.body}>{load.destination}</Text>

        <Text style={styles.section}>Trip steps</Text>
        <Text style={styles.hint}>
          Complete each step in order. You cannot skip ahead.
        </Text>
        {(Object.keys(STEP_LABELS) as MilestoneStep[]).map((key) => {
          const done =
            key === "pickup_on_site"
              ? !!load.driver_milestone_pickup_at
              : key === "pickup_loaded"
                ? !!load.driver_milestone_loaded_at
                : key === "delivery_arrived"
                  ? !!load.driver_milestone_delivery_at
                  : !!load.driver_milestone_bol_at;
          const isNext = nextStep === key;
          return (
            <View key={key} style={styles.stepRow}>
              <Text style={[styles.stepLabel, done && styles.stepDone]}>
                {done ? "✓ " : "○ "}
                {STEP_LABELS[key]}
              </Text>
              {isNext && !mBusy ? (
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => void advance(key)}
                  disabled={mBusy}
                >
                  <Text style={styles.stepBtnText}>Mark complete</Text>
                </Pressable>
              ) : null}
              {isNext && mBusy ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
          );
        })}
        {mErr ? <Text style={styles.err}>{mErr}</Text> : null}
        {load.status === "delivered" ? (
          <Text style={styles.doneNote}>This load is complete.</Text>
        ) : null}

        {(load.pickup_location_name || load.pickup_address || load.pickup_date) && (
          <>
            <Text style={styles.section}>Pickup</Text>
            {load.pickup_location_name ? (
              <Text style={styles.body}>{load.pickup_location_name}</Text>
            ) : null}
            {load.pickup_address ? (
              <>
                <Text style={styles.dim}>{load.pickup_address}</Text>
                <Pressable style={styles.linkBtn} onPress={() => openMaps(load.pickup_address)}>
                  <Text style={styles.link}>Open in Maps</Text>
                </Pressable>
              </>
            ) : null}
            {load.pickup_date ? (
              <Text style={styles.meta}>
                {load.pickup_date}
                {load.pickup_time_window ? ` · ${load.pickup_time_window}` : ""}
              </Text>
            ) : null}
          </>
        )}

        {(load.delivery_location_name ||
          load.delivery_address ||
          load.delivery_date) && (
          <>
            <Text style={styles.section}>Delivery</Text>
            {load.delivery_location_name ? (
              <Text style={styles.body}>{load.delivery_location_name}</Text>
            ) : null}
            {load.delivery_address ? (
              <>
                <Text style={styles.dim}>{load.delivery_address}</Text>
                <Pressable style={styles.linkBtn} onPress={() => openMaps(load.delivery_address)}>
                  <Text style={styles.link}>Open in Maps</Text>
                </Pressable>
              </>
            ) : null}
            {load.delivery_date ? (
              <Text style={styles.meta}>
                {load.delivery_date}
                {load.delivery_time_window ? ` · ${load.delivery_time_window}` : ""}
              </Text>
            ) : null}
          </>
        )}

        {(load.commodities || load.weight_lbs != null) && (
          <>
            <Text style={styles.section}>Freight</Text>
            {load.commodities ? <Text style={styles.body}>{load.commodities}</Text> : null}
            {load.weight_lbs != null ? (
              <Text style={styles.meta}>Weight: {load.weight_lbs.toLocaleString()} lbs</Text>
            ) : null}
          </>
        )}

        {load.special_instructions ? (
          <>
            <Text style={styles.section}>Instructions</Text>
            <Text style={styles.body}>{load.special_instructions}</Text>
          </>
        ) : null}

        <Text style={styles.section}>Messages with dispatch</Text>
        <View style={styles.msgBox}>
          {messages.length === 0 ? (
            <Text style={styles.dim}>No messages yet.</Text>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={styles.msgBubble}>
                <Text style={styles.msgMeta}>
                  Message ·{" "}
                  {new Date(m.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Text>
                <Text style={styles.msgBody}>{m.body}</Text>
              </View>
            ))
          )}
        </View>
        <TextInput
          style={styles.msgInput}
          placeholder="Message dispatch…"
          placeholderTextColor={colors.dim}
          value={msgText}
          onChangeText={setMsgText}
          multiline
          maxLength={4000}
        />
        <Pressable
          style={[styles.sendBtn, (!msgText.trim() || msgBusy) && styles.sendBtnOff]}
          onPress={() => void onSendMessage()}
          disabled={!msgText.trim() || msgBusy}
        >
          {msgBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          {load.dispatched_at ? (
            <Text style={styles.dim}>Dispatched: {load.dispatched_at}</Text>
          ) : null}
          {load.delivered_at ? (
            <Text style={styles.dim}>Delivered: {load.delivered_at}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 24 },
  content: { padding: 20, paddingBottom: 48, gap: 8 },
  hero: {
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  status: { fontSize: 14, fontWeight: "700", color: colors.accent, textTransform: "capitalize" },
  linehaul: { fontSize: 24, fontWeight: "700", color: colors.text },
  section: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hint: { fontSize: 13, color: colors.dim, lineHeight: 18 },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  arrow: { color: colors.dim, fontSize: 18, marginVertical: 4 },
  dim: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  meta: { fontSize: 14, color: colors.muted },
  linkBtn: { alignSelf: "flex-start", marginTop: 6 },
  link: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  footer: { marginTop: 24, gap: 4 },
  err: { color: colors.danger, fontSize: 14, textAlign: "center" },
  stepRow: { gap: 8, marginTop: 8 },
  stepLabel: { fontSize: 15, color: colors.text },
  stepDone: { color: colors.success },
  stepBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stepBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  doneNote: { marginTop: 8, color: colors.success, fontSize: 14 },
  msgBox: { gap: 10, marginTop: 8 },
  msgBubble: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  msgMeta: { fontSize: 11, color: colors.dim },
  msgBody: { marginTop: 4, fontSize: 15, color: colors.text },
  msgInput: {
    marginTop: 8,
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0f1012",
    padding: 12,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: "top",
  },
  sendBtn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  sendBtnOff: { opacity: 0.5 },
  sendBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
