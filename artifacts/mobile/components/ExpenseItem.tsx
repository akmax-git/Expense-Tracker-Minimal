import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryInfo, Expense, formatINR } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { confirmDestructive } from "@/lib/confirm";

interface Props {
  expense: Expense;
  category?: CategoryInfo;
  onDelete?: (id: string) => void | Promise<void>;
  compact?: boolean;
}

export function ExpenseItem({ expense, category, onDelete, compact }: Props) {
  const colors = useColors();
  const catColor = category?.color ?? "#636E72";
  const catIcon = (category?.icon ?? "grid-outline") as any;

  const date = new Date(expense.date + "T00:00:00");
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const noteBit = expense.note ? ` — ${expense.note}` : "";
    const ok = await confirmDestructive(
      "Delete expense?",
      `${expense.category}${noteBit}\n${formatINR(expense.amount)}\n\nThis cannot be undone.`,
      "Delete"
    );
    if (!ok) return;
    await onDelete(expense.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openBill = async () => {
    if (!expense.billUrl) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(expense.billUrl);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          paddingVertical: compact ? 10 : 14,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: catColor + "22", borderRadius: compact ? 10 : 12 },
        ]}
      >
        <Ionicons name={catIcon} size={compact ? 17 : 20} color={catColor} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.catName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {expense.category}
        </Text>
        {expense.note ? (
          <Text
            style={[styles.note, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {expense.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={styles.amountRow}>
          {expense.billUrl ? (
            <Pressable
              onPress={openBill}
              hitSlop={8}
              style={styles.billBtn}
              accessibilityRole="button"
              accessibilityLabel="Open bill"
            >
              <Ionicons name="receipt-outline" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatINR(expense.amount)}
          </Text>
          {onDelete ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={10}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: colors.destructive + (pressed ? "28" : "14"),
                  borderColor: colors.destructive + "35",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete expense"
            >
              <Ionicons
                name="trash-outline"
                size={15}
                color={colors.destructive}
              />
            </Pressable>
          ) : null}
        </View>
        {!compact && (
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formattedDate}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  catName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billBtn: {
    padding: 2,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
