import Ionicons from "react-native-vector-icons/Ionicons";
import { useState } from "react";
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
import { NexusFreightLogo } from "../components/NexusFreightLogo";
import { getPasswordResetRedirectUrl } from "../lib/site";
import { getSupabase } from "../lib/supabase";
import { colors } from "../theme";

export function AuthScreen() {
  const supabase = getSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetHint, setResetHint] = useState<string | null>(null);

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

  async function forgotPassword() {
    const client = getSupabase();
    if (!client) return;
    setAuthError(null);
    setResetHint(null);
    const em = email.trim();
    if (!em) {
      setAuthError("Enter your email address first, then tap Forgot password.");
      return;
    }
    setResetBusy(true);
    try {
      const redirectTo = getPasswordResetRedirectUrl();
      const { error } = await client.auth.resetPasswordForEmail(em, {
        redirectTo,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      setResetHint(
        "If an account exists for that email, we sent a reset link. Open it in your browser to choose a new password."
      );
    } finally {
      setResetBusy(false);
    }
  }

  if (!supabase) {
    return (
      <View style={styles.center}>
        <Text style={styles.warn}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (same as
          NEXT_PUBLIC_* in the web app).
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <NexusFreightLogo />
        <Text style={styles.brandSub}>Driver</Text>
        <Text style={styles.sub}>
          Sign in with the email your carrier linked to your driver profile.
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@carrier.com"
            placeholderTextColor={colors.dim}
            value={email}
            onChangeText={setEmail}
            editable={!authBusy}
          />
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoCapitalize="none"
              placeholder="••••••••"
              placeholderTextColor={colors.dim}
              value={password}
              onChangeText={setPassword}
              editable={!authBusy}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((s) => !s)}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.muted}
              />
            </Pressable>
          </View>
          <Pressable
            style={styles.forgotRow}
            onPress={() => void forgotPassword()}
            disabled={resetBusy}
          >
            {resetBusy ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.linkText}>Forgot password?</Text>
            )}
          </Pressable>
          {resetHint ? <Text style={styles.hintOk}>{resetHint}</Text> : null}
          {authError ? <Text style={styles.errText}>{authError}</Text> : null}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  scroll: { padding: 20, paddingTop: 48, paddingBottom: 40, gap: 14 },
  brandSub: {
    alignSelf: "center",
    marginTop: -4,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.12,
    color: colors.muted,
    textTransform: "uppercase",
  },
  sub: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
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
    color: colors.text,
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
  },
  eyeBtn: {
    padding: 10,
    marginRight: -4,
  },
  forgotRow: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  linkText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  hintOk: {
    fontSize: 13,
    color: colors.success,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errText: { color: colors.danger, fontSize: 14 },
  warn: { color: colors.warn, fontSize: 14, lineHeight: 20 },
});
