import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { formatINR } from "@/context/ExpenseContext";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: PieSlice[];
  size?: number;
  total?: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string {
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, endDeg);
  const i1 = polarToCartesian(cx, cy, innerR, endDeg);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

export function PieChart({ data, size = 200, total }: Props) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.55;
  const totalValue = total ?? data.reduce((s, d) => s + d.value, 0);

  if (totalValue === 0) {
    return (
      <View
        style={[
          styles.empty,
          { width: size, height: size, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No data
        </Text>
      </View>
    );
  }

  let currentAngle = 0;
  const slices = data.map((slice) => {
    const startAngle = currentAngle;
    const sweep = (slice.value / totalValue) * 360;
    const endAngle = startAngle + sweep - 0.5;
    currentAngle += sweep;
    return { ...slice, startAngle, endAngle, sweep };
  });

  return (
    <View style={styles.wrapper}>
      <View style={{ position: "relative", width: size, height: size }}>
        <Svg width={size} height={size}>
          {slices.map((s, i) =>
            s.sweep > 0.5 ? (
              <Path
                key={i}
                d={describeArc(cx, cy, outerR, innerR, s.startAngle, s.endAngle)}
                fill={s.color}
              />
            ) : null
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
            Total
          </Text>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            {formatINR(totalValue)}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text
              style={[styles.legendLabel, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {s.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.mutedForeground }]}>
              {((s.value / totalValue) * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.legendAmount, { color: colors.foreground }]}>
              {formatINR(s.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 20,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    borderRadius: 100,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  legend: {
    width: "100%",
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  legendValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    width: 36,
    textAlign: "right",
  },
  legendAmount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    width: 80,
    textAlign: "right",
  },
});
