import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatINR } from "@/context/ExpenseContext";
import type { MonthOverMonthResult } from "@/lib/dashboardInsights";
import { useColors } from "@/hooks/useColors";

interface Props {
  compare: MonthOverMonthResult;
}

export function MonthCompareCard({ compare }: Props) {
  const colors = useColors();
  const { delta, percentChange, previous, current } = compare;

  const isUp = delta > 0;
  const isFlat = delta === 0;
  const tone = isFlat
    ? colors.mutedForeground
    : isUp
      ? colors.destructive
      : colors.accent;

  let deltaLabel: string;
  if (previous === 0 && current === 0) {
    deltaLabel = "No spend either month";
  } else if (previous === 0 && current > 0) {
    deltaLabel = "No spend last month";
  } else if (percentChange !== null) {
    const sign = percentChange > 0 ? "+" : "";
    deltaLabel = `${sign}${percentChange.toFixed(0)}% vs last month`;
  } else {
    deltaLabel = "vs last month";
  }

  const amountLabel = isFlat
    ? formatINR(0)
    : `${isUp ? "+" : "−"}${formatINR(Math.abs(delta))}`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          vs Last Month
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: tone + "18", borderColor: tone + "35" },
          ]}
        >
          <Ionicons
            name={
              isFlat
                ? "remove-outline"
                : isUp
                  ? "trending-up-outline"
                  : "trending-down-outline"
            }
            size={14}
            color={tone}
          />
          <Text style={[styles.badgeText, { color: tone }]}>{amountLabel}</Text>
        </View>
      </View>
      <Text style={[styles.deltaHint, { color: colors.foreground }]}>
        {deltaLabel}
      </Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: colors.mutedForeground }]}>
            This month
          </Text>
          <Text style={[styles.colValue, { color: colors.foreground }]}>
            {formatINR(current)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.col}>
          <Text style={[styles.colLabel, { color: colors.mutedForeground }]}>
            Last month
          </Text>
          <Text style={[styles.colValue, { color: colors.foreground }]}>
            {formatINR(previous)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  deltaHint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  col: {
    flex: 1,
    gap: 2,
  },
  colLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  colValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: 12,
  },
});
