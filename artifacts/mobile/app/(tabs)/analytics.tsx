import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PieChart, PieSlice } from "@/components/PieChart";
import { TrendChart } from "@/components/TrendChart";
import {
  currentMonth,
  formatINR,
  formatMonth,
  useExpenses,
} from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

function monthOffset(base: string, offset: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "breakdown" | "trend";

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getMonthExpenses, getMonthBudget, allCategories, getCategoryInfo } =
    useExpenses();

  const [month, setMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<Tab>("breakdown");

  const expenses = getMonthExpenses(month);
  const budget = getMonthBudget(month);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const pieData = useMemo<PieSlice[]>(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => {
        const cat = getCategoryInfo(name);
        return { label: name, value, color: cat?.color ?? "#636E72" };
      });
  }, [expenses, getCategoryInfo]);

  const topCategory = pieData[0];
  const avgDaily = useMemo(() => {
    if (expenses.length === 0) return 0;
    const days = new Set(expenses.map((e) => e.date)).size;
    return days > 0 ? totalSpent / days : 0;
  }, [expenses, totalSpent]);

  const trendData = useMemo(() => {
    const now = new Date();
    const result: { date: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const amount = expenses
        .filter((e) => e.date === key)
        .reduce((s, e) => s + e.amount, 0);
      result.push({ date: key, amount });
    }
    return result;
  }, [expenses]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => setMonth((m) => monthOffset(m, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {formatMonth(month)}
        </Text>
        <Pressable
          onPress={() => setMonth((m) => monthOffset(m, 1))}
          hitSlop={12}
          style={{ opacity: month >= currentMonth() ? 0.3 : 1 }}
          disabled={month >= currentMonth()}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Spent"
            value={formatINR(totalSpent)}
            icon="wallet-outline"
            color={colors.primary}
            colors={colors}
          />
          <StatCard
            label="Budget"
            value={formatINR(budget)}
            icon="pie-chart-outline"
            color={colors.accent}
            colors={colors}
          />
          <StatCard
            label="Avg/Day"
            value={formatINR(Math.round(avgDaily))}
            icon="trending-up-outline"
            color="#FF9F43"
            colors={colors}
          />
          <StatCard
            label="Top Category"
            value={topCategory?.label ?? "—"}
            icon="star-outline"
            color="#FD79A8"
            colors={colors}
          />
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {(["breakdown", "trend"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tabBtn,
                activeTab === t && { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === t ? colors.foreground : colors.mutedForeground,
                    fontFamily:
                      activeTab === t ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t === "breakdown" ? "By Category" : "30-Day Trend"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Chart content */}
        {activeTab === "breakdown" ? (
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {pieData.length > 0 ? (
              <PieChart data={pieData} size={200} total={totalSpent} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="pie-chart-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No expenses in this period
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chartTitle, { color: colors.foreground }]}>
              Last 30 Days
            </Text>
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <TrendChart data={trendData} width={300} height={140} />
            </View>
            <View style={[styles.trendStats, { borderTopColor: colors.border }]}>
              <View style={styles.trendStat}>
                <Text style={[styles.trendStatVal, { color: colors.foreground }]}>
                  {formatINR(Math.max(...trendData.map((d) => d.amount)))}
                </Text>
                <Text style={[styles.trendStatLabel, { color: colors.mutedForeground }]}>
                  Peak Day
                </Text>
              </View>
              <View style={[styles.trendDivider, { backgroundColor: colors.border }]} />
              <View style={styles.trendStat}>
                <Text style={[styles.trendStatVal, { color: colors.foreground }]}>
                  {trendData.filter((d) => d.amount > 0).length}
                </Text>
                <Text style={[styles.trendStatLabel, { color: colors.mutedForeground }]}>
                  Active Days
                </Text>
              </View>
              <View style={[styles.trendDivider, { backgroundColor: colors.border }]} />
              <View style={styles.trendStat}>
                <Text style={[styles.trendStatVal, { color: colors.foreground }]}>
                  {formatINR(Math.round(avgDaily))}
                </Text>
                <Text style={[styles.trendStatLabel, { color: colors.mutedForeground }]}>
                  Daily Avg
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top categories list */}
        {pieData.length > 0 && activeTab === "breakdown" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Top Spending
            </Text>
            {pieData.slice(0, 5).map((slice, i) => (
              <View
                key={slice.label}
                style={[
                  styles.catRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.catRank, { color: colors.mutedForeground }]}>
                  {i + 1}
                </Text>
                <View style={[styles.catDot, { backgroundColor: slice.color }]} />
                <Text
                  style={[styles.catName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {slice.label}
                </Text>
                <View style={styles.catBarWrap}>
                  <View
                    style={[
                      styles.catBar,
                      {
                        backgroundColor: slice.color + "44",
                        width: `${(slice.value / totalSpent) * 100}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.catAmount, { color: colors.foreground }]}>
                  {formatINR(slice.value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        scStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[scStyles.iconWrap, { backgroundColor: color + "22" }]}>
        <Ionicons
          name={icon as Parameters<typeof Ionicons>[0]["name"]}
          size={18}
          color={color}
        />
      </View>
      <Text style={[scStyles.value, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[scStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: "45%",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
  },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    alignSelf: "flex-start",
  },
  trendStats: {
    flexDirection: "row",
    alignSelf: "stretch",
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  trendStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  trendDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  trendStatVal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  trendStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  catRank: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 16,
    textAlign: "center",
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  catBarWrap: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  catBar: {
    height: "100%",
    borderRadius: 3,
  },
  catAmount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    minWidth: 60,
    textAlign: "right",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
