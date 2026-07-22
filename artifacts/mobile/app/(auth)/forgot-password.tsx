import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

const GREEN = "#00C853";
const BLUE = "#1565C0";
const BLUE_DARK = "#0D47A1";
const WHITE = "#FFFFFF";
const MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const LABEL = "#64748B";
const ERROR_RED = "#EF4444";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    const err = await resetPasswordForEmail(email);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  }

  return (
    <View style={styles.root}>
      {/* Hero */}
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.heroIcon}>🔑</Text>
        <Text style={styles.heroTitle}>Forgot password?</Text>
        <Text style={styles.heroSub}>
          Enter your email and we'll send you a reset link.
        </Text>
      </LinearGradient>

      {/* Form sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheet}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            /* Success state */
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>{email}</Text>
                .{"\n\n"}Tap the link in the email to set a new password. Check
                your spam folder if you don't see it.
              </Text>
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                style={({ pressed }) => [
                  styles.backToLoginBtn,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>
                We'll email you a secure link to reset it.
              </Text>

              {/* Email field */}
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <View
                  style={[
                    styles.inputBox,
                    emailFocused && styles.inputBoxFocused,
                  ]}
                >
                  <Text style={styles.fieldIcon}>✉</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@example.com"
                    placeholderTextColor={MUTED}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              )}

              {/* Send button */}
              <Pressable
                onPress={handleSend}
                disabled={loading}
                style={({ pressed }) => [
                  { opacity: pressed || loading ? 0.85 : 1, marginTop: 8 },
                ]}
              >
                <LinearGradient
                  colors={[GREEN, "#00A844", BLUE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Reset Link →</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={styles.cancelRow}
              >
                <Text style={styles.cancelText}>Back to Sign In</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  hero: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  heroIcon: { fontSize: 40, marginBottom: 4 },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  sheet: {
    flex: 1,
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: LABEL,
    marginTop: -8,
    marginBottom: 4,
  },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: LABEL,
    letterSpacing: 0.8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    gap: 10,
  },
  inputBoxFocused: {
    borderColor: BLUE,
    backgroundColor: WHITE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  fieldIcon: { fontSize: 14 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0F172A",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: ERROR_RED,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  cancelRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: LABEL,
  },
  /* Success */
  successBox: {
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
  },
  successIcon: { fontSize: 52 },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: LABEL,
    textAlign: "center",
    lineHeight: 22,
  },
  backToLoginBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  backToLoginText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#0F172A",
  },
});
