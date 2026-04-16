import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDriverLoadsList } from "../hooks/useDriverLoads";
import { colors } from "../theme";
import { formatLoadStatus, formatUsd } from "../utils/format";
import type { LoadsStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<LoadsStackParamList, "LoadsList">;

type Props = {
  driverId: string;
};

type Segment = "active" | "past";

export function MyLoadsScreen({ driverId }: Props) {
  const navigation = useNavigation<Nav>();
  const [segment, setSegment] = useState<Segment>("active");
  const { activeLoads, pastLoads, loading, error, refresh } =
    useDriverLoadsList(driverId);

  const list = segment === "active" ? activeLoads : pastLoads;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.getParent()?.navigate("MoreTab" as never)}
          style={styles.headerBtn}
          accessibilityLabel="Contact dispatch"
          accessibilityRole="button"
        >
          <Ionicons name="call-outline" size={22} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <View style={styles.segmentWrap}>
        <Pressable
          style={[styles.segment, segment === "active" && styles.segmentOn]}
          onPress={() => setSegment("active")}
        >
          <Text
            style={[styles.segmentText, segment === "active" && styles.segmentTextOn]}
          >
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, segment === "past" && styles.segmentOn]}
          onPress={() => setSegment("past")}
        >
          <Text
            style={[styles.segmentText, segment === "past" && styles.segmentTextOn]}
          >
            Past
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={list.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.accent} />
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.empty}>
                {segment === "active"
                  ? "No active loads right now. When dispatch assigns you a load, it will show under Active."
                  : "No completed or cancelled loads yet. Finished loads appear here."}
              </Text>
              <Pressable
                style={styles.cta}
                onPress={() => navigation.getParent()?.navigate("MoreTab" as never)}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                <Text style={styles.ctaText}> Contact dispatch</Text>
              </Pressable>
              <Text style={styles.emptyHint}>
                Call, text, or email your team from the More tab anytime.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("LoadDetail", { loadId: item.id })}
          >
            <View style={styles.row}>
              <Text
                style={[
                  styles.status,
                  item.status === "cancelled" && styles.statusWarn,
                ]}
              >
                {formatLoadStatus(item.status)}
              </Text>
              <Text style={styles.rate}>{formatUsd(item.rate_cents)}</Text>
            </View>
            <Text style={styles.route} numberOfLines={2}>
              {item.origin} → {item.destination}
            </Text>
            {segment === "active" && item.pickup_date ? (
              <Text style={styles.meta}>Pickup: {item.pickup_date}</Text>
            ) : null}
            {segment === "past" ? (
              <Text style={styles.meta}>
                {item.status === "delivered" && item.delivered_at
                  ? `Completed ${new Date(item.delivered_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : item.status === "cancelled"
                    ? "Load cancelled"
                    : null}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerBtn: { padding: 8, marginRight: 4 },
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentOn: {
    backgroundColor: "rgba(37, 99, 235, 0.25)",
  },
  segmentText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
  },
  segmentTextOn: {
    color: colors.text,
  },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyContainer: { flexGrow: 1, padding: 24, justifyContent: "center" },
  emptyBlock: { gap: 16, alignItems: "center" },
  loader: { marginTop: 48 },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 13,
    color: colors.dim,
    textAlign: "center",
    lineHeight: 18,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  err: { color: colors.danger, paddingHorizontal: 16, paddingBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  status: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    textTransform: "capitalize",
  },
  statusWarn: { color: colors.warn },
  rate: { fontSize: 15, fontWeight: "600", color: colors.text },
  route: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
});
