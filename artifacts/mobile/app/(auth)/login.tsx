import { Ionicons } from "@expo/vector-icons";
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
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    const err = await signInWithEmail(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const err = await signInWithGoogle();
    setGoogleLoading(false);
    if (err) setError(err);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Gradient top accent */}
      <LinearGradient
        colors={[colors.primary + "44", "transparent"]}
        style={styles.gradientTop}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + title */}
          <View style={styles.hero}>
            <View
              style={[
                styles.logoBox,
                { backgroundColor: colors.primary + "22" },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={36}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>
              Expense Tracker
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Sign in to access your expenses
            </Text>
          </View>

          {/* Form card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Welcome back
            </Text>

            {/* Email */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  style={[styles.input, { color: colors.foreground }]}
                />
                <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: "#FF4D4D18", borderColor: "#FF4D4D44" },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={14} color="#FF4D4D" />
                <Text style={[styles.errorText, { color: "#FF4D4D" }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Sign in button */}
            <Pressable
              onPress={handleEmailLogin}
              disabled={loading}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
              <Text
                style={[
                  styles.dividerText,
                  { color: colors.mutedForeground },
                ]}
              >
                or
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
            </View>

            {/* Google button */}
            <Pressable
              onPress={handleGoogle}
              disabled={googleLoading}
              style={[
                styles.googleBtn,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  opacity: googleLoading ? 0.7 : 1,
                },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <>
                  <Text style={styles.googleG}>G</Text>
                  <Text
                    style={[
                      styles.googleBtnText,
                      { color: colors.foreground },
                    ]}
                  >
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Switch to signup */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")} hitSlop={8}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>
                {" "}Sign up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    pointerEvents: "none",
  },
  scroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
    gap: 10,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleG: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  switchLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
