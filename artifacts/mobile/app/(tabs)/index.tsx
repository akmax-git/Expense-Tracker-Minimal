import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BudgetRing } from "@/components/BudgetRing";
import { CategoryBars } from "@/components/dashboard/CategoryBars";
import { InsightStatusCard } from "@/components/dashboard/InsightStatusCard";
import { MonthCompareCard } from "@/components/dashboard/MonthCompareCard";
import { PaceCard } from "@/components/dashboard/PaceCard";
import { ExpenseItem } from "@/components/ExpenseItem";
import { TrendChart } from "@/components/TrendChart";
import {
  currentMonth,
  formatINR,
  formatMonth,
  useExpenses,
} from "@/context/ExpenseContext";
import { useManager } from "@/context/ManagerContext";
import { SettingsModal } from "@/components/SettingsModal";
import { useColors } from "@/hooks/useColors";
import {
  categoryBreakdown,
  dailySeriesForMonth,
  monthOffset,
  monthOverMonth,
  paceMetrics,
  statusHeadline,
  sumExpenses,
} from "@/lib/dashboardInsights";
import { confirmDestructive } from "@/lib/confirm";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { viewingAsEmail, isManagerMode, canEdit, activeGrant } = useManager();
  const {
    getMonthExpenses,
    getMonthBudget,
    getMonthOpeningBalance,
    getMonthIncomeTotal,
    getMonthIncomes,
    quickTemplates,
    getCategoryInfo,
    addExpense,
    deleteExpense,
    deleteIncome,
  } = useExpenses();

  const [month, setMonth] = useState(currentMonth);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const isCurrentMonth = month === currentMonth();
  const openingBalance = getMonthOpeningBalance(month);
  const surplusAdded = getMonthIncomeTotal(month);
  const budget = getMonthBudget(month); // opening + new surplus
  const monthIncomes = getMonthIncomes(month);
  const monthExpenses = getMonthExpenses(month);
  const prevMonthExpenses = getMonthExpenses(monthOffset(month, -1));
  const spent = sumExpenses(monthExpenses);
  const remaining = budget - spent;
  const prevMonthLabel = formatMonth(monthOffset(month, -1));

  const pace = useMemo(
    () => paceMetrics({ spent, budget, month }),
    [spent, budget, month]
  );

  const compare = useMemo(
    () => monthOverMonth(spent, sumExpenses(prevMonthExpenses)),
    [spent, prevMonthExpenses]
  );

  const topCategories = useMemo(
    () => categoryBreakdown(monthExpenses, 4),
    [monthExpenses]
  );

  const sparkData = useMemo(() => {
    const full = dailySeriesForMonth(monthExpenses, month);
    if (!isCurrentMonth) return full;
    const today = new Date().getDate();
    return full.slice(0, today);
  }, [monthExpenses, month, isCurrentMonth]);

  const headline = useMemo(
    () => statusHeadline(pace, isManagerMode),
    [pace, isManagerMode]
  );

  const topCategory = topCategories[0];
  const recentExpenses = monthExpenses.slice(0, 8);
  const chartWidth = Math.min(windowWidth - 64, 360);

  const handleDeleteIncome = async (id: string, label: string) => {
    const ok = await confirmDestructive(
      "Delete Cash Surplus?",
      `Remove ${label}?\n\nThis updates your Cash Surplus and Cash Balance. This cannot be undone.`,
      "Delete"
    );
    if (!ok) return;
    await deleteIncome(id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleQuickAdd = async (template: (typeof quickTemplates)[0]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await addExpense({
      amount: template.amount,
      category: template.category,
      note: template.label,
      date: dateStr,
    });
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => setMonth((m) => monthOffset(m, -1))}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={() => setMonth(currentMonth)} style={styles.headerCenter}>
          <Image
            source={require("@/assets/images/lifeeasy-logo-nobg.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.headerMonth, { color: colors.foreground }]}>
            {formatMonth(month)}
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          {!isCurrentMonth && (
            <Pressable
              onPress={() => setMonth((m) => monthOffset(m, 1))}
              hitSlop={12}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setSettingsModalVisible(true)}
            hitSlop={12}
            style={{ marginRight: 4 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Manager mode banner */}
      {isManagerMode && (
        <View
          style={[
            styles.managerBanner,
            { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
          ]}
        >
          <Ionicons name="eye-outline" size={15} color={colors.primary} />
          <Text style={[styles.managerBannerText, { color: colors.primary }]}>
            Viewing {viewingAsEmail ?? "manager account"}
            {activeGrant
              ? ` — ${
                  activeGrant.permission === "full"
                    ? "full access"
                    : activeGrant.permission === "edit"
                      ? "can edit"
                      : "read only"
                }`
              : " — read only"}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Budget ring + stats */}
        <View
          style={[
            styles.budgetCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.ringRow}>
            <BudgetRing spent={spent} budget={budget} size={180} />
            <View style={styles.statsCol}>
              <StatPill
                label="Cash Surplus"
                value={formatINR(budget)}
                color={colors.primary}
                colors={colors}
              />
              <StatPill label="Spent" value={formatINR(spent)} color={colors.destructive} colors={colors} />
              <StatPill
                label="Cash Balance"
                value={formatINR(Math.max(remaining, 0))}
                color={colors.accent}
                colors={colors}
              />
            </View>
          </View>
        </View>

        {/* Prior month leftover rolls into this month's Cash Surplus */}
        {openingBalance > 0 && (
          <View
            style={[
              styles.carryCard,
              {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons name="sync-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.carryTitle, { color: colors.primary }]}>
                Carried from {prevMonthLabel}
              </Text>
              <Text style={[styles.carryBody, { color: colors.foreground }]}>
                {formatINR(openingBalance)} Cash Balance brought forward
                {surplusAdded > 0
                  ? ` + ${formatINR(surplusAdded)} new this month`
                  : ""}
              </Text>
            </View>
            <Text style={[styles.carryAmount, { color: colors.primary }]}>
              {formatINR(openingBalance)}
            </Text>
          </View>
        )}

        {/* Fresh start: no surplus and no carry yet */}
        {budget <= 0 && canEdit && (
          <Pressable
            onPress={() => router.push("/(tabs)/add")}
            style={[
              styles.startCard,
              {
                backgroundColor: colors.accent + "12",
                borderColor: colors.accent + "35",
              },
            ]}
          >
            <Ionicons name="wallet-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.startTitle, { color: colors.foreground }]}>
                Start with Cash Surplus
              </Text>
              <Text style={[styles.startBody, { color: colors.mutedForeground }]}>
                When money comes in (e.g. ₹84,000 from boss), add it as Cash
                Surplus. Leftover Cash Balance auto-carries to the next month.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        )}

        {/* Status insight */}
        <InsightStatusCard
          status={budget > 0 ? pace.status : "none"}
          title={headline.title}
          message={headline.message}
          subtitle={
            topCategory
              ? `Biggest: ${topCategory.label} (${formatINR(topCategory.value)})`
              : openingBalance > 0 && spent === 0
                ? `Includes ${formatINR(openingBalance)} carried from ${prevMonthLabel}`
                : null
          }
        />

        {/* vs Last Month */}
        <MonthCompareCard compare={compare} />

        {/* Pace */}
        <PaceCard pace={pace} />

        {/* Top categories */}
        <CategoryBars
          slices={topCategories}
          getCategoryInfo={getCategoryInfo}
        />

        {/* Month sparkline */}
        <View
          style={[
            styles.sparkCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sparkHeader}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {isCurrentMonth ? "Daily Spend (MTD)" : "Daily Spend"}
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/analytics")}
              hitSlop={8}
              style={styles.seeLink}
            >
              <Text style={[styles.seeLinkText, { color: colors.primary }]}>
                Analytics
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.sparkChart}>
            <TrendChart data={sparkData} width={chartWidth} height={110} />
          </View>
        </View>

        {/* Quick add — only when own account or manager has edit/full */}
        {isCurrentMonth && canEdit && quickTemplates.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Quick Add
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
              {quickTemplates.map((t) => {
                const cat = getCategoryInfo(t.category);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => handleQuickAdd(t)}
                    style={({ pressed }) => [
                      styles.quickBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.quickIcon,
                        { backgroundColor: (cat?.color ?? "#636E72") + "22" },
                      ]}
                    >
                      <Ionicons
                        name={(cat?.icon ?? "grid-outline") as Parameters<typeof Ionicons>[0]["name"]}
                        size={16}
                        color={cat?.color ?? "#636E72"}
                      />
                    </View>
                    <Text style={[styles.quickLabel, { color: colors.foreground }]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.quickAmount, { color: colors.primary }]}>
                      {formatINR(t.amount)}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => router.push("/(tabs)/add")}
                style={({ pressed }) => [
                  styles.quickBtn,
                  {
                    backgroundColor: colors.primary + "15",
                    borderColor: colors.primary + "40",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.quickLabel, { color: colors.primary }]}>Custom</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Recent income */}
        {monthIncomes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Cash Surplus this month
            </Text>
            {monthIncomes.slice(0, 6).map((inc) => (
              <View
                key={inc.id}
                style={[
                  styles.incomeItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.incomeIcon,
                    { backgroundColor: colors.accent + "22" },
                  ]}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[styles.incomeSource, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {inc.source}
                  </Text>
                  <Text
                    style={[styles.incomeMeta, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {inc.date}
                    {inc.note ? ` · ${inc.note}` : ""}
                  </Text>
                </View>
                <Text style={[styles.incomeAmount, { color: colors.accent }]}>
                  +{formatINR(inc.amount)}
                </Text>
                {canEdit && (
                  <Pressable
                    onPress={() =>
                      handleDeleteIncome(
                        inc.id,
                        `${formatINR(inc.amount)} (${inc.source})`
                      )
                    }
                    hitSlop={12}
                    style={({ pressed }) => [
                      styles.incomeDeleteBtn,
                      {
                        backgroundColor:
                          colors.destructive + (pressed ? "28" : "14"),
                        borderColor: colors.destructive + "35",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Delete Cash Surplus"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.destructive}
                    />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Recent expenses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {recentExpenses.length > 0 ? "Recent expenses" : "No expenses yet"}
          </Text>
          {recentExpenses.map((exp) => (
            <ExpenseItem
              key={exp.id}
              expense={exp}
              category={getCategoryInfo(exp.category)}
              onDelete={canEdit ? deleteExpense : undefined}
            />
          ))}
          {monthExpenses.length > 8 && (
            <Pressable
              onPress={() => router.push("/(tabs)/records")}
              style={[styles.seeAll, { borderColor: colors.border }]}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                See all {monthExpenses.length} expenses
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        budgetMonth={month}
      />
    </View>
  );
}

function StatPill({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles.pill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 1,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  headerMonth: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  budgetCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  startCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  startTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  startBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  carryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  carryTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  carryBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  carryAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statsCol: {
    flex: 1,
    gap: 8,
  },
  sparkCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  sparkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sparkChart: {
    alignItems: "center",
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  quickRow: {
    flexDirection: "row",
  },
  quickBtn: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
    minWidth: 72,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  quickAmount: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  incomeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  incomeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  incomeSource: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  incomeMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  incomeAmount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  incomeDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  managerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  managerBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
