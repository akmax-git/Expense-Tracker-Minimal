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

import { ExpenseItem } from "@/components/ExpenseItem";
import {
  currentMonth,
  dateToString,
  formatINR,
  formatMonth,
  useExpenses,
} from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthOffset(base: string, off: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + off, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getMonthExpenses, getDayExpenses, getCategoryInfo, deleteExpense } =
    useExpenses();

  const [month, setMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState(dateToString(new Date()));

  const monthExpenses = getMonthExpenses(month);

  const { year, mon, firstDOW, daysInMonth } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return {
      year: y,
      mon: m,
      firstDOW: first.getDay(),
      daysInMonth: last.getDate(),
    };
  }, [month]);

  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      map[e.date] = (map[e.date] ?? 0) + e.amount;
    });
    return map;
  }, [monthExpenses]);

  const dayExpenses = getDayExpenses(selectedDate);
  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDOW }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = dateToString(new Date());

  function makeDateStr(day: number) {
    return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

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
        {/* Calendar grid */}
        <View
          style={[
            styles.calCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => (
              <Text
                key={wd}
                style={[styles.weekDay, { color: colors.mutedForeground }]}
              >
                {wd}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }
              const dateStr = makeDateStr(day);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const hasTx = !!dayTotals[dateStr];
              const cellTotal = dayTotals[dateStr] ?? 0;

              return (
                <Pressable
                  key={dateStr}
                  onPress={() => setSelectedDate(dateStr)}
                  style={[
                    styles.dayCell,
                    isSelected && {
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: isSelected
                          ? colors.primaryForeground
                          : isToday
                          ? colors.primary
                          : colors.foreground,
                        fontFamily: isToday || isSelected
                          ? "Inter_700Bold"
                          : "Inter_400Regular",
                      },
                    ]}
                  >
                    {day}
                  </Text>
                  {hasTx && (
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryForeground
                            : colors.accent,
                        },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected day expenses */}
        <View style={styles.section}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayTitle, { color: colors.foreground }]}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            {dayTotal > 0 && (
              <Text style={[styles.dayTotal, { color: colors.primary }]}>
                {formatINR(dayTotal)}
              </Text>
            )}
          </View>

          {dayExpenses.length === 0 ? (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No expenses on this day
              </Text>
            </View>
          ) : (
            dayExpenses.map((exp) => (
              <ExpenseItem
                key={exp.id}
                expense={exp}
                category={getCategoryInfo(exp.category)}
                onDelete={deleteExpense}
                compact
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
  calCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayNum: {
    fontSize: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  section: {
    gap: 10,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dayTotal: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
