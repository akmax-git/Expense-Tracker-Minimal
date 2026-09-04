import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  useEffect(() => {
    const prefill = typeof params.email === "string" ? params.email.trim() : "";
    if (prefill) setEmail(prefill);
  }, [params.email]);

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
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={styles.hero}
      >
        <View style={[styles.logoBadge, { backgroundColor: colors.card }]}>
          <Image
            source={require("@/assets/images/lifeeasy-logo-nobg.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Lifeeasy</Text>
        <Text style={styles.tagline}>Smart money. Simplified life.</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            ...colors.shadow.sheet,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to your account
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              EMAIL
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  borderColor: emailFocused ? colors.primary : colors.border,
                  backgroundColor: emailFocused ? colors.card : colors.input,
                  shadowColor: colors.primary,
                  shadowOpacity: emailFocused ? 0.18 : 0,
                  shadowRadius: emailFocused ? 6 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: emailFocused ? 2 : 0,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? colors.primary : colors.mutedForeground}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.foreground }]}
                accessibilityLabel="Email"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              PASSWORD
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  borderColor: passFocused ? colors.primary : colors.border,
                  backgroundColor: passFocused ? colors.card : colors.input,
                  shadowColor: colors.primary,
                  shadowOpacity: passFocused ? 0.18 : 0,
                  shadowRadius: passFocused ? 6 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: passFocused ? 2 : 0,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passFocused ? colors.primary : colors.mutedForeground}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={[styles.input, { color: colors.foreground }]}
                accessibilityLabel="Password"
              />
              <Pressable
                onPress={() => setShowPass((v) => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPass ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            hitSlop={8}
            style={styles.forgotRow}
            accessibilityRole="link"
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </Pressable>

          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + "12",
                  borderColor: colors.destructive + "35",
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.destructive}
              />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label="Sign In"
            onPress={handleEmailLogin}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 4 }}
          />

          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
              or
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={({ pressed, hovered }) => [
              styles.googleBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                opacity: pressed || googleLoading ? 0.75 : hovered ? 0.92 : 1,
              },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <View
                  style={[
                    styles.googleIconBox,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[styles.googleText, { color: colors.foreground }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              New to Lifeeasy?
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text style={[styles.switchLink, { color: colors.success }]}>
                {" "}
                Create account
              </Text>
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
  },
  hero: {
    paddingTop: 72,
    paddingBottom: 48,
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
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
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
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
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
  },
  switchLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
