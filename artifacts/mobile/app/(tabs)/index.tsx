import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BudgetRing } from "@/components/BudgetRing";
import { ExpenseItem } from "@/components/ExpenseItem";
import { useAuth } from "@/context/AuthContext";
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

function getDaysRemainingInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return last.getDate() - now.getDate();
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const {
    getMonthExpenses,
    getMonthBudget,
    setMonthBudget,
    quickTemplates,
    allCategories,
    getCategoryInfo,
    addExpense,
    deleteExpense,
  } = useExpenses();

  const [month, setMonth] = useState(currentMonth);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const isCurrentMonth = month === currentMonth();
  const budget = getMonthBudget(month);
  const monthExpenses = getMonthExpenses(month);
  const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - spent;
  const daysLeft = getDaysRemainingInMonth();
  const dailyBudget = daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0;

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  }, [monthExpenses]);

  const recentExpenses = monthExpenses.slice(0, 8);

  const saveBudget = () => {
    const val = parseFloat(budgetInput.replace(/,/g, ""));
    if (!isNaN(val) && val > 0) {
      setMonthBudget(month, val);
      setBudgetModalVisible(false);
      setBudgetInput("");
    } else {
      Alert.alert("Invalid amount", "Please enter a valid budget.");
    }
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
            onPress={() => {
              setBudgetInput(String(budget));
              setBudgetModalVisible(true);
            }}
            hitSlop={12}
            style={{ marginRight: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Sign out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: signOut },
              ])
            }
            hitSlop={12}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

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
              <StatPill label="Budget" value={formatINR(budget)} color={colors.primary} colors={colors} />
              <StatPill label="Spent" value={formatINR(spent)} color={colors.destructive} colors={colors} />
              <StatPill label="Left" value={formatINR(Math.max(remaining, 0))} color={colors.accent} colors={colors} />
            </View>
          </View>
        </View>

        {/* Smart insight */}
        {isCurrentMonth && budget > 0 && (
          <View
            style={[
              styles.insightCard,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
            ]}
          >
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}>
              {dailyBudget > 0 ? (
                <Text style={[styles.insightText, { color: colors.foreground }]}>
                  You can spend{" "}
                  <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                    {formatINR(Math.round(dailyBudget))}/day
                  </Text>{" "}
                  for the next {daysLeft} days.
                </Text>
              ) : remaining <= 0 ? (
                <Text style={[styles.insightText, { color: colors.destructive }]}>
                  Over budget by {formatINR(Math.abs(remaining))}. Consider cutting back.
                </Text>
              ) : (
                <Text style={[styles.insightText, { color: colors.foreground }]}>
                  Last day of the month — {formatINR(remaining)} left.
                </Text>
              )}
              {topCategory && (
                <Text style={[styles.insightSub, { color: colors.mutedForeground }]}>
                  Biggest: {topCategory[0]} ({formatINR(topCategory[1])})
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Quick add */}
        {isCurrentMonth && quickTemplates.length > 0 && (
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

        {/* Recent expenses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {recentExpenses.length > 0 ? "Recent" : "No expenses yet"}
          </Text>
          {recentExpenses.map((exp) => (
            <ExpenseItem
              key={exp.id}
              expense={exp}
              category={getCategoryInfo(exp.category)}
              onDelete={deleteExpense}
            />
          ))}
          {monthExpenses.length > 8 && (
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              style={[styles.seeAll, { borderColor: colors.border }]}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                See all {monthExpenses.length} expenses
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Budget modal */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Set Monthly Budget
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {formatMonth(month)}
            </Text>
            <TextInput
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="30000"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                },
              ]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setBudgetModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveBudget}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statsCol: {
    flex: 1,
    gap: 8,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  insightText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  insightSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  modalInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
