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

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    const err = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setDone(true);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <Text style={styles.heroIcon}>🔐</Text>
        <Text style={styles.heroTitle}>Set new password</Text>
        <Text style={styles.heroSub}>
          Choose a strong password for your account.
        </Text>
      </LinearGradient>

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
          {done ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Password updated!</Text>
              <Text style={styles.successText}>
                Your password has been changed successfully. You can now sign in
                with your new password.
              </Text>
              <Pressable
                onPress={() => router.replace("/(tabs)/")}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: pressed ? 0.85 : 1, marginTop: 8 },
                ]}
              >
                <LinearGradient
                  colors={[GREEN, "#00A844", BLUE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Go to Dashboard →</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Create new password</Text>
              <Text style={styles.subtitle}>Must be at least 6 characters.</Text>

              {/* New password */}
              <View style={styles.field}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View
                  style={[
                    styles.inputBox,
                    passFocused && styles.inputBoxFocused,
                  ]}
                >
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    placeholder="••••••••"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setShowPass((v) => !v)}
                    hitSlop={12}
                  >
                    <Text style={{ fontSize: 15 }}>
                      {showPass ? "🙈" : "👁"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Confirm password */}
              <View style={styles.field}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View
                  style={[
                    styles.inputBox,
                    confirmFocused && styles.inputBoxFocused,
                    confirm.length > 0 && password !== confirm
                      ? styles.inputBoxError
                      : null,
                  ]}
                >
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    placeholder="••••••••"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={12}
                  >
                    <Text style={{ fontSize: 15 }}>
                      {showConfirm ? "🙈" : "👁"}
                    </Text>
                  </Pressable>
                </View>
                {confirm.length > 0 && password !== confirm && (
                  <Text style={styles.matchError}>Passwords don't match</Text>
                )}
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleReset}
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
                    <Text style={styles.primaryBtnText}>Update Password →</Text>
                  )}
                </LinearGradient>
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
    alignItems: "flex-start",
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
  inputBoxError: {
    borderColor: ERROR_RED,
  },
  fieldIcon: { fontSize: 14 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0F172A",
  },
  matchError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: ERROR_RED,
    marginTop: -2,
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
});
