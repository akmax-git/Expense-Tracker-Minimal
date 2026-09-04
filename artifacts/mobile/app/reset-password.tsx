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

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { updatePassword, session, isLoading, isPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const linkReady = !!session && (isPasswordRecovery || done);
  const linkInvalid = !isLoading && !session && !done;

  async function handleReset() {
    if (!session) {
      setError("Reset link expired or invalid. Please request a new one.");
      return;
    }
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
    <View style={[styles.root, { backgroundColor: colors.card }]}>
      <LinearGradient
        colors={["#0A1628", "#0F1E38", "#07111E"]}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <Ionicons name="lock-closed-outline" size={36} color="rgba(255,255,255,0.85)" />
        <Text style={styles.heroTitle}>Set new password</Text>
        <Text style={styles.heroSub}>
          Choose a strong password for your account.
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
          {done ? (
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
                Password updated!
              </Text>
              <Text
                style={[styles.successText, { color: colors.mutedForeground }]}
              >
                Your password has been changed successfully. You can now sign in
                with your new password.
              </Text>
              <PrimaryButton
                label="Go to Dashboard"
                onPress={() => router.replace("/(tabs)/")}
                style={{ marginTop: 8, alignSelf: "stretch" }}
              />
            </View>
          ) : isLoading || (isPasswordRecovery && !session) ? (
            <View style={styles.successBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                Verifying reset link…
              </Text>
              <Text
                style={[styles.successText, { color: colors.mutedForeground }]}
              >
                Please wait while we open the password form.
              </Text>
            </View>
          ) : linkInvalid ? (
            <View style={styles.successBox}>
              <View
                style={[
                  styles.successIconCircle,
                  {
                    backgroundColor: colors.destructive + "12",
                    borderColor: colors.destructive + "35",
                  },
                ]}
              >
                <Ionicons
                  name="warning-outline"
                  size={32}
                  color={colors.destructive}
                />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                Link expired or invalid
              </Text>
              <Text
                style={[styles.successText, { color: colors.mutedForeground }]}
              >
                This reset link is no longer valid. Request a new one from the
                login screen.
              </Text>
              <PrimaryButton
                label="Request new link"
                onPress={() => router.replace("/(auth)/forgot-password")}
                style={{ marginTop: 8, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Create new password
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Must be at least 6 characters.
              </Text>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  NEW PASSWORD
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      borderColor: passFocused
                        ? colors.primary
                        : colors.border,
                      backgroundColor: passFocused
                        ? colors.card
                        : colors.input,
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
                    color={
                      passFocused ? colors.primary : colors.mutedForeground
                    }
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
                    accessibilityLabel="New password"
                  />
                  <Pressable
                    onPress={() => setShowPass((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPass ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  CONFIRM PASSWORD
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      borderColor:
                        confirm.length > 0 && password !== confirm
                          ? colors.destructive
                          : confirmFocused
                            ? colors.primary
                            : colors.border,
                      backgroundColor: confirmFocused
                        ? colors.card
                        : colors.input,
                      shadowColor:
                        confirm.length > 0 && password !== confirm
                          ? colors.destructive
                          : colors.primary,
                      shadowOpacity: confirmFocused ? 0.18 : 0,
                      shadowRadius: confirmFocused ? 6 : 0,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: confirmFocused ? 2 : 0,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={
                      confirm.length > 0 && password !== confirm
                        ? colors.destructive
                        : confirmFocused
                          ? colors.primary
                          : colors.mutedForeground
                    }
                  />
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.foreground }]}
                    accessibilityLabel="Confirm password"
                  />
                  <Pressable
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirm ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
                {confirm.length > 0 && password !== confirm ? (
                  <Text
                    style={[styles.matchError, { color: colors.destructive }]}
                  >
                    Passwords don't match
                  </Text>
                ) : null}
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
                label="Update Password"
                onPress={handleReset}
                loading={loading}
                disabled={loading || !linkReady}
                style={{ marginTop: 4 }}
              />
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
    alignItems: "flex-start",
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
  matchError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
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
