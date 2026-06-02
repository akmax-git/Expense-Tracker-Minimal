import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { formatINR } from "@/context/ExpenseContext";

interface Props {
  spent: number;
  budget: number;
  size?: number;
}

export function BudgetRing({ spent, budget, size = 180 }: Props) {
  const colors = useColors();
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const offset = circumference * (1 - percentage);
  const isOver = spent > budget;
  const isWarning = !isOver && percentage >= 0.8;
  const ringColor = isOver
    ? colors.destructive
    : isWarning
    ? "#FF9F43"
    : colors.primary;
  const remaining = budget - spent;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {isOver ? "Over budget" : "Remaining"}
        </Text>
        <Text
          style={[
            styles.amount,
            { color: isOver ? colors.destructive : colors.foreground },
          ]}
        >
          {formatINR(Math.abs(remaining))}
        </Text>
        <Text style={[styles.pct, { color: colors.mutedForeground }]}>
          {(percentage * 100).toFixed(0)}% used
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  pct: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
