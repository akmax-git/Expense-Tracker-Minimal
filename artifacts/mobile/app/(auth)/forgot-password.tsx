import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Ionicons name="key-outline" size={36} color="rgba(255,255,255,0.85)" />
        <Text style={styles.heroTitle}>Forgot password?</Text>
        <Text style={styles.heroSub}>
          Enter your email and we'll send you a reset link.
        </Text>
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
          {sent ? (
            <View style={styles.successBox}>
              <View
                style={[
                  styles.successIconCircle,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={36}
                  color={colors.success}
                />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                Check your inbox
              </Text>
              <Text
                style={[styles.successText, { color: colors.mutedForeground }]}
              >
                We've sent a password reset link to{" "}
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: colors.foreground,
                  }}
                >
                  {email}
                </Text>
                .{"\n\n"}Tap the link in the email to set a new password. Check
                your spam/junk folder if you don't see it within a few minutes.
              </Text>
              <PrimaryButton
                label="Back to Sign In"
                onPress={() => router.replace("/(auth)/login")}
                variant="secondary"
                style={{ marginTop: 8, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Reset your password
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                We'll email you a secure link to reset it.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  EMAIL
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      borderColor: emailFocused
                        ? colors.primary
                        : colors.border,
                      backgroundColor: emailFocused
                        ? colors.card
                        : colors.input,
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
                    color={
                      emailFocused ? colors.primary : colors.mutedForeground
                    }
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
                    autoFocus
                    style={[styles.input, { color: colors.foreground }]}
                    accessibilityLabel="Email"
                  />
                </View>
              </View>

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
                  <Text
                    style={[styles.errorText, { color: colors.destructive }]}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              <PrimaryButton
                label="Send Reset Link"
                onPress={handleSend}
                loading={loading}
                disabled={loading}
                style={{ marginTop: 4 }}
              />

              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={styles.cancelRow}
                accessibilityRole="link"
              >
                <Text
                  style={[styles.cancelText, { color: colors.mutedForeground }]}
                >
                  Back to Sign In
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
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
    fontSize: 22,
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
  field: { gap: 6 },
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
  cancelRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  successBox: {
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
