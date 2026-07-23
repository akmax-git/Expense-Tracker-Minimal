import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatINR, type CategoryInfo } from "@/context/ExpenseContext";
import type { CategorySlice } from "@/lib/dashboardInsights";
import { useColors } from "@/hooks/useColors";

interface Props {
  slices: CategorySlice[];
  getCategoryInfo: (name: string) => CategoryInfo | undefined;
  showSeeAll?: boolean;
}

export function CategoryBars({
  slices,
  getCategoryInfo,
  showSeeAll = true,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          Top Categories
        </Text>
        {showSeeAll ? (
          <Pressable
            onPress={() => router.push("/(tabs)/analytics")}
            hitSlop={8}
            style={styles.seeLink}
          >
            <Text style={[styles.seeLinkText, { color: colors.primary }]}>
              See breakdown
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {slices.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No category spend this month
          </Text>
        </View>
      ) : (
        slices.map((slice) => {
          const cat = getCategoryInfo(slice.label);
          const color = cat?.color ?? "#636E72";
          const widthPct = Math.max(Math.min(slice.percent, 100), 2);
          return (
            <View
              key={slice.label}
              style={[
                styles.row,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
                <Ionicons
                  name={(cat?.icon ?? "grid-outline") as any}
                  size={16}
                  color={color}
                />
              </View>
              <View style={styles.mid}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.name, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {slice.label}
                  </Text>
                  <Text style={[styles.pct, { color: colors.mutedForeground }]}>
                    {slice.percent.toFixed(0)}%
                  </Text>
                </View>
                <View
                  style={[styles.barTrack, { backgroundColor: colors.muted }]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: color,
                        width: `${widthPct}%` as `${number}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.amount, { color: colors.foreground }]}>
                {formatINR(slice.value)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  seeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeLinkText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  pct: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  amount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    minWidth: 64,
    textAlign: "right",
  },
});
