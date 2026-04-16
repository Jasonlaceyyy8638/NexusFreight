import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { colors } from "../theme";

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <NexusFreightLogo />
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
});
