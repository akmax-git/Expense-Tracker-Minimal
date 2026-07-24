import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatINR } from "@/context/ExpenseContext";
import type { PaceMetrics } from "@/lib/dashboardInsights";
import { useColors } from "@/hooks/useColors";

interface Props {
  pace: PaceMetrics;
}

export function PaceCard({ pace }: Props) {
  const colors = useColors();
  const showAllowance = pace.isCurrentMonth && pace.budget > 0;
  const projectedColor =
    pace.projectedTotal > pace.budget && pace.budget > 0
      ? colors.destructive
      : colors.foreground;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Spending Pace
      </Text>
      <View style={styles.row}>
        <Metric
          label="Avg / day"
          value={formatINR(Math.round(pace.avgPerDay))}
          colors={colors}
        />
        {showAllowance ? (
          <Metric
            label="Balance / day"
            value={
              pace.dailyAllowance > 0
                ? formatINR(Math.round(pace.dailyAllowance))
                : "—"
            }
            colors={colors}
            valueColor={
              pace.dailyAllowance > 0 ? colors.primary : colors.mutedForeground
            }
          />
        ) : (
          <Metric
            label="Days tracked"
            value={String(pace.daysElapsed)}
            colors={colors}
          />
        )}
        <Metric
          label={pace.isCurrentMonth ? "Projected" : "Total"}
          value={formatINR(Math.round(pace.projectedTotal))}
          colors={colors}
          valueColor={projectedColor}
        />
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  valueColor?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          { color: valueColor ?? colors.foreground },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
