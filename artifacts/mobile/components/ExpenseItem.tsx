import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryInfo, Expense, formatINR } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  expense: Expense;
  category?: CategoryInfo;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function ExpenseItem({ expense, category, onDelete, compact }: Props) {
  const colors = useColors();
  const catColor = category?.color ?? "#636E72";
  const catIcon = (category?.icon ?? "grid-outline") as Parameters<typeof Ionicons>[0]["name"];

  const date = new Date(expense.date + "T00:00:00");
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const handleLongPress = async () => {
    if (!onDelete) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete expense?", `${expense.category} — ${formatINR(expense.amount)}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(expense.id),
      },
    ]);
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
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
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {formatINR(expense.amount)}
        </Text>
        {!compact && (
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formattedDate}
          </Text>
        )}
      </View>
    </Pressable>
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
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
