import { Pressable, StyleSheet, Text, View } from "react-native";
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { colors } from "../theme";
import { getSupabase } from "../lib/supabase";

export function UnlinkedDriverScreen() {
  async function signOut() {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut();
  }

  return (
    <View style={styles.root}>
      <NexusFreightLogo width={300} />
      <Text style={styles.title}>Account not linked</Text>
      <Text style={styles.body}>
        Your login is active, but there is no driver profile tied to it yet. Ask
        your carrier or dispatcher to link this email to your roster in
        NexusFreight (driver row with login / auth linked).
      </Text>
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  body: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  button: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
  },
  buttonText: { color: colors.text, fontSize: 15, fontWeight: "500" },
});
