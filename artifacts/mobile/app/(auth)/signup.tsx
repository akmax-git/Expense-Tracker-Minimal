import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    const err = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (err) setError(err);
    else setSuccess(true);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const err = await signInWithGoogle();
    setGoogleLoading(false);
    if (err) setError(err);
  }

  if (success) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#0A1628", "#0F1E38", "#07111E"]}
          style={styles.hero}
        >
          <View style={styles.logoBadge}>
            <Image
              source={require("@/assets/images/lifeeasy-logo-nobg.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Lifeeasy</Text>
        </LinearGradient>
        <View style={[styles.sheet, { flex: 1 }]}>
          <View style={styles.successContent}>
            <View style={styles.successIconBox}>
              <Text style={{ fontSize: 38 }}>🎉</Text>
            </View>
            <Text style={styles.title}>Account created!</Text>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>
              Check your email for a confirmation link, then sign in to start
              tracking your finances.
            </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              style={{ width: "100%" }}
            >
              <LinearGradient
                colors={[GREEN, "#00A844", BLUE_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Go to Sign In →</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Top hero */}
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={styles.hero}
      >
        <View style={styles.logoBadge}>
          <Image
            source={require("@/assets/images/lifeeasy-logo-nobg.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Lifeeasy</Text>
        <Text style={styles.tagline}>Create your free account</Text>
      </LinearGradient>

      {/* White form sheet */}
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
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>
            Join thousands managing their money
          </Text>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>FULL NAME</Text>
            <View
              style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}
            >
              <Text style={styles.fieldIcon}>👤</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Your name"
                placeholderTextColor={MUTED}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <View
              style={[styles.inputBox, emailFocused && styles.inputBoxFocused]}
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
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <View
              style={[styles.inputBox, passFocused && styles.inputBoxFocused]}
            >
              <Text style={styles.fieldIcon}>🔒</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="Min. 6 characters"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                hitSlop={12}
              >
                <Text style={{ fontSize: 15 }}>{showPass ? "🙈" : "👁"}</Text>
              </Pressable>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleSignup}
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
                <Text style={styles.primaryBtnText}>Create Account →</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            style={({ pressed }) => [
              styles.googleBtn,
              { opacity: pressed || googleLoading ? 0.75 : 1 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={BLUE} size="small" />
            ) : (
              <>
                <View style={styles.googleIconBox}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?</Text>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              hitSlop={8}
            >
              <Text style={styles.switchLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
  },
  hero: {
    paddingTop: 64,
    paddingBottom: 44,
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 4,
  },
  logo: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    flex: 1,
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
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F0FFF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
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
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
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
  fieldIcon: {
    fontSize: 14,
  },
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: MUTED,
  },
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },
  googleText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#0F172A",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    paddingBottom: 8,
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: LABEL,
  },
  switchLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: GREEN,
  },
});
