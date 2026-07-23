import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { PaceStatus } from "@/lib/dashboardInsights";
import { useColors } from "@/hooks/useColors";

interface Props {
  status: PaceStatus | "none";
  title: string;
  message: string;
  subtitle?: string | null;
}

function statusMeta(
  status: PaceStatus | "none",
  colors: ReturnType<typeof useColors>
) {
  switch (status) {
    case "over":
      return {
        icon: "alert-circle-outline" as const,
        color: colors.destructive,
        bg: colors.destructive + "15",
        border: colors.destructive + "30",
      };
    case "at_risk":
      return {
        icon: "warning-outline" as const,
        color: "#FF9F43",
        bg: "#FF9F4315",
        border: "#FF9F4330",
      };
    case "none":
      return {
        icon: "information-circle-outline" as const,
        color: colors.mutedForeground,
        bg: colors.muted,
        border: colors.border,
      };
    default:
      return {
        icon: "checkmark-circle-outline" as const,
        color: colors.accent,
        bg: colors.accent + "15",
        border: colors.accent + "30",
      };
  }
}

export function InsightStatusCard({ status, title, message, subtitle }: Props) {
  const colors = useColors();
  const meta = statusMeta(status, colors);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: meta.bg, borderColor: meta.border },
      ]}
    >
      <Ionicons name={meta.icon} size={20} color={meta.color} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: meta.color }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.foreground }]}>
          {message}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  message: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
