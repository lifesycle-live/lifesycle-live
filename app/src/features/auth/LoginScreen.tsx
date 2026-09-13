import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../state/authStore";
import { ApiError } from "../../api/client";
import { colors, radius, shadow } from "../../theme";

export function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (registering) await signUp(name.trim(), email.trim().toLowerCase(), password, inviteCode);
      else await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Wrong email or password."
          : err instanceof Error
            ? err.message
            : "Sign in failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSocial(provider: "Google" | "Facebook") {
    setError(`${provider} sign-in is not configured yet. ${registering ? "Create an account" : "Sign in"} with your email below.`);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Lifesycle Live</Text>
        <Text style={styles.subtitle}>{registering ? "Your next chapter starts here" : "Beautiful homes. Real connections."}</Text>

        <View style={[styles.card, shadow]}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 20 }}>{registering ? "Create your account" : "Welcome back"}</Text>
          {registering && <TextInput accessibilityLabel="Full name" style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />}
          {registering && <TextInput accessibilityLabel="Team invitation code" style={styles.input} placeholder="Team invitation code" autoCapitalize="none" secureTextEntry value={inviteCode} onChangeText={setInviteCode} />}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{registering ? "Create account" : "Sign in"}</Text>
            )}
          </TouchableOpacity>

          {registering && <Text style={styles.dividerText}>Use at least 12 characters for your password.</Text>}
          <TouchableOpacity disabled={submitting} onPress={() => { setRegistering(!registering); setError(null); }} style={{ paddingVertical: 18 }}>
            <Text style={{ color: colors.primaryDark, textAlign: "center", fontWeight: "600" }}>{registering ? "Already a member? Sign in" : "New here? Create an account"}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocial("Google")}
          >
            <Text style={styles.socialGlyph}>G</Text>
            <Text style={styles.socialButtonText}>Google · setup pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocial("Facebook")}
          >
            <Text style={[styles.socialGlyph, { color: "#1877F2" }]}>f</Text>
            <Text style={styles.socialButtonText}>Facebook · setup pending</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  brand: { fontSize: 28, fontWeight: "800", color: colors.primaryDark, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: 28 },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  error: { color: colors.live, fontSize: 13, marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: colors.textMuted },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  socialGlyph: { fontSize: 16, fontWeight: "800", color: colors.textMuted, width: 22, textAlign: "center" },
  socialButtonText: { fontSize: 14, fontWeight: "600", color: colors.text, marginLeft: 6 },
});
