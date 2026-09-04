import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CategoryInfo,
  Expense,
  ExpenseStatus,
  formatINR,
} from "@/context/ExpenseContext";
import { useColors, type ColorTokens } from "@/hooks/useColors";
import { confirmDestructive } from "@/lib/confirm";

function statusMeta(
  status: ExpenseStatus,
  colors: ColorTokens
): { label: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        color: colors.success,
        icon: "checkmark-circle",
      };
    case "rejected":
      return {
        label: "Rejected",
        color: colors.destructive,
        icon: "close-circle",
      };
    default:
      return {
        label: "Pending",
        color: colors.warning,
        icon: "time-outline",
      };
  }
}

interface Props {
  expense: Expense;
  category?: CategoryInfo;
  onDelete?: (id: string) => void | Promise<void>;
  onApprove?: (id: string) => void | Promise<void>;
  onReject?: (id: string) => void | Promise<void>;
  /** Show approve/reject controls (owner or manager with edit) */
  canReview?: boolean;
  compact?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ExpenseStatus;
  size?: "sm" | "md";
}) {
  const colors = useColors();
  const meta = statusMeta(status, colors);
  const small = size === "sm";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: meta.color + "18",
          borderColor: meta.color + "40",
          paddingHorizontal: small ? 6 : 8,
          paddingVertical: small ? 2 : 3,
        },
      ]}
    >
      <Ionicons name={meta.icon} size={small ? 11 : 12} color={meta.color} />
      <Text
        style={[
          styles.badgeText,
          { color: meta.color, fontSize: small ? 10 : 11 },
        ]}
      >
        {meta.label}
      </Text>
    </View>
  );
}

export function ExpenseItem({
  expense,
  category,
  onDelete,
  onApprove,
  onReject,
  canReview,
  compact,
}: Props) {
  const colors = useColors();
  const catColor = category?.color ?? "#636E72";
  const catIcon = (category?.icon ?? "grid-outline") as any;
  const scale = useRef(new Animated.Value(1)).current;
  const reviewOpacity = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = React.useState(false);

  const status = expense.status ?? "approved";
  const meta = statusMeta(status, colors);
  const approvedMeta = statusMeta("approved", colors);
  const rejectedMeta = statusMeta("rejected", colors);
  const showReview =
    !!canReview && status === "pending" && (!!onApprove || !!onReject);

  useEffect(() => {
    reviewOpacity.setValue(0);
    Animated.spring(reviewOpacity, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [status, reviewOpacity]);

  const date = new Date(expense.date + "T00:00:00");
  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

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

  const handleApprove = async () => {
    if (!onApprove || busy) return;
    setBusy(true);
    pulse();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await onApprove(expense.id);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || busy) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await confirmDestructive(
      "Reject expense?",
      `${expense.category} — ${formatINR(expense.amount)}\n\nRejected expenses won't count toward spend totals.`,
      "Reject"
    );
    if (!ok) return;
    setBusy(true);
    pulse();
    try {
      await onReject(expense.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setBusy(false);
    }
  };

  const mutedAmount =
    status === "rejected" || status === "pending";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor:
            status === "pending"
              ? meta.color + "55"
              : status === "rejected"
                ? meta.color + "40"
                : colors.border,
          paddingVertical: compact ? 10 : 14,
          transform: [{ scale }],
          opacity: status === "rejected" ? 0.78 : 1,
          ...colors.shadow.card,
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
        <View style={styles.titleRow}>
          <Text
            style={[styles.catName, { color: colors.foreground, flexShrink: 1 }]}
            numberOfLines={1}
          >
            {expense.category}
          </Text>
          <StatusBadge status={status} size="sm" />
        </View>
        {expense.note ? (
          <Text
            style={[styles.note, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {expense.note}
          </Text>
        ) : null}
        {showReview ? (
          <Animated.View
            style={[styles.reviewRow, { opacity: reviewOpacity }]}
          >
            <Pressable
              onPress={handleApprove}
              disabled={busy}
              style={({ pressed }) => [
                styles.reviewBtn,
                {
                  backgroundColor: approvedMeta.color + (pressed ? "28" : "16"),
                  borderColor: approvedMeta.color + "45",
                  opacity: busy ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Approve expense"
            >
              <Ionicons
                name="checkmark"
                size={14}
                color={approvedMeta.color}
              />
              <Text
                style={[
                  styles.reviewBtnText,
                  { color: approvedMeta.color },
                ]}
              >
                Approve
              </Text>
            </Pressable>
            <Pressable
              onPress={handleReject}
              disabled={busy}
              style={({ pressed }) => [
                styles.reviewBtn,
                {
                  backgroundColor: rejectedMeta.color + (pressed ? "28" : "16"),
                  borderColor: rejectedMeta.color + "45",
                  opacity: busy ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reject expense"
            >
              <Ionicons
                name="close"
                size={14}
                color={rejectedMeta.color}
              />
              <Text
                style={[
                  styles.reviewBtnText,
                  { color: rejectedMeta.color },
                ]}
              >
                Reject
              </Text>
            </Pressable>
          </Animated.View>
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
          <Text
            style={[
              styles.amount,
              {
                color: mutedAmount
                  ? colors.mutedForeground
                  : colors.foreground,
                textDecorationLine:
                  status === "rejected" ? "line-through" : "none",
              },
            ]}
          >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
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
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  reviewBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
