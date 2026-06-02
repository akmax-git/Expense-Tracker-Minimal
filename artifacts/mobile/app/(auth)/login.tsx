import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

const { width } = Dimensions.get("window");

// Brand colours
const GREEN = "#00C853";
const BLUE = "#1565C0";
const BLUE_DARK = "#0D47A1";
const BG = "#07111E";
const CARD = "#0D1F36";
const BORDER = "#1A2E4A";
const INPUT_BG = "#0F1A2E";
const MUTED = "#7A8FAD";
const WHITE = "#FFFFFF";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

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
    <View style={styles.root}>
      {/* Full-screen dark background */}
      <LinearGradient
        colors={["#050E1A", "#07111E", "#0A1728"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glowing orbs */}
      <View style={[styles.orb, styles.orbGreen]} />
      <View style={[styles.orb, styles.orbBlue]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 32,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + brand name */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/lifeeasy-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>Lifeeasy</Text>
            <Text style={styles.brandTagline}>
              Smart money. Simplified life.
            </Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            {/* Card top gradient border */}
            <LinearGradient
              colors={[GREEN, BLUE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopBorder}
            />

            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {/* Email input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrap,
                  emailFocused && styles.inputWrapFocused,
                ]}
              >
                {emailFocused && (
                  <LinearGradient
                    colors={[GREEN, BLUE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inputBorderGradient}
                  />
                )}
                <View style={styles.inputInner}>
                  <Text style={styles.inputIcon}>✉</Text>
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
            </View>

            {/* Password input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrap,
                  passFocused && styles.inputWrapFocused,
                ]}
              >
                {passFocused && (
                  <LinearGradient
                    colors={[GREEN, BLUE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inputBorderGradient}
                  />
                )}
                <View style={styles.inputInner}>
                  <Text style={styles.inputIcon}>🔒</Text>
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
                    <Text style={styles.eyeIcon}>{showPass ? "🙈" : "👁"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorDot}>⚠</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Sign In button */}
            <Pressable
              onPress={handleEmailLogin}
              disabled={loading}
              style={({ pressed }) => [{ opacity: pressed || loading ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[GREEN, "#00A045", BLUE_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInBtn}
              >
                {loading ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <Text style={styles.signInBtnText}>Sign In →</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <Pressable
              onPress={handleGoogle}
              disabled={googleLoading}
              style={({ pressed }) => [
                styles.googleBtn,
                { opacity: pressed || googleLoading ? 0.75 : 1 },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <>
                  <View style={styles.googleIconBox}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Google</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Switch to signup */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>New to Lifeeasy?</Text>
            <Pressable onPress={() => router.push("/(auth)/signup")} hitSlop={8}>
              <Text style={styles.switchLink}> Create account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.18,
  },
  orbGreen: {
    width: 280,
    height: 280,
    backgroundColor: GREEN,
    top: -60,
    left: -80,
  },
  orbBlue: {
    width: 240,
    height: 240,
    backgroundColor: BLUE,
    bottom: 40,
    right: -60,
  },
  scroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  logo: {
    width: 80,
    height: 80,
  },
  brandName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    overflow: "hidden",
    gap: 16,
  },
  cardTopBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: WHITE,
    marginTop: 4,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: MUTED,
    marginTop: -8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: MUTED,
    letterSpacing: 1,
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: "hidden",
    backgroundColor: INPUT_BG,
  },
  inputWrapFocused: {
    borderColor: "transparent",
  },
  inputBorderGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: -1.5,
    borderRadius: 14,
    zIndex: 0,
  },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    paddingHorizontal: 14,
    gap: 10,
    backgroundColor: INPUT_BG,
    borderRadius: 13,
    margin: 1.5,
    zIndex: 1,
  },
  inputIcon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: WHITE,
  },
  eyeIcon: {
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,71,87,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.3)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorDot: {
    fontSize: 13,
    color: "#FF4757",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FF4757",
  },
  signInBtn: {
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  signInBtnText: {
    color: WHITE,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: MUTED,
  },
  googleBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
  },
  googleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: WHITE,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: MUTED,
  },
  switchLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: GREEN,
  },
});
