import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Optional accent used when active (e.g. category / status color) */
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function FilterChip({
  label,
  active,
  onPress,
  color,
  style,
  accessibilityLabel,
}: Props) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed, hovered }) => [
        styles.chip,
        {
          backgroundColor: active ? activeColor + "18" : colors.card,
          borderColor: active ? activeColor : colors.border,
          opacity: pressed ? 0.85 : hovered ? 0.92 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: active ? activeColor : colors.mutedForeground,
            fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
  },
});
