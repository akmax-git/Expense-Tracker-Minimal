import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "destructive" | "ghost";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  accessibilityLabel,
}: Props) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const palette = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: colors.secondary,
          text: colors.secondaryForeground,
          border: colors.border,
          shadow: undefined,
        };
      case "destructive":
        return {
          bg: colors.destructive,
          text: colors.destructiveForeground,
          border: colors.destructive,
          shadow: undefined,
        };
      case "ghost":
        return {
          bg: "transparent",
          text: colors.primary,
          border: colors.border,
          shadow: undefined,
        };
      default:
        return {
          bg: colors.primary,
          text: colors.primaryForeground,
          border: colors.primary,
          shadow: colors.shadow.button,
        };
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed, hovered }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : hovered ? 0.94 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        palette.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
