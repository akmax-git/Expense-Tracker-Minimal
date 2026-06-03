import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
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

import { CategoryGrid } from "@/components/CategoryGrid";
import {
  Expense,
  dateToString,
  formatINR,
  useExpenses,
} from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const GREEN = "#00C853";
const BLUE = "#1565C0";

function todayStr() {
  return dateToString(new Date());
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToString(d);
}
function formatDate(dateStr: string): string {
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, allCategories, deleteExpense, addExpense, getCategoryInfo } =
    useExpenses();

  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Filter expenses by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q) ||
        String(e.amount).includes(q)
    );
  }, [expenses, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of filtered) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function openEdit(expense: Expense) {
    setEditTarget(expense);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditNote(expense.note);
    setEditDate(expense.date);
    setShowEdit(true);
  }

  async function handleDelete(expense: Expense) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Expense",
      `Delete ₹${expense.amount} from ${expense.category}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(expense.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    setEditSaving(true);
    // Delete old and re-add with new data (updateExpense pattern)
    await deleteExpense(editTarget.id);
    await addExpense({ amount, category: editCategory, note: editNote, date: editDate });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditSaving(false);
    setShowEdit(false);
    setEditTarget(null);
  }

  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Records</Text>
          <View style={[styles.totalBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.totalBadgeText, { color: colors.primary }]}>
              {formatINR(totalAll)} total
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by category or note..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🧾</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "No results" : "No expenses yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {search
                ? `Nothing matched "${search}"`
                : "Tap + Add to record your first expense"}
            </Text>
          </View>
        ) : (
          grouped.map(([date, items]) => (
            <View key={date} style={styles.group}>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                  {formatDate(date)}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dateTotalText, { color: colors.mutedForeground }]}>
                  {formatINR(items.reduce((s, e) => s + e.amount, 0))}
                </Text>
              </View>

              {/* Receipt cards */}
              {items.map((expense) => {
                const catInfo = getCategoryInfo(expense.category);
                const catColor = catInfo?.color ?? "#888";
                return (
                  <ReceiptCard
                    key={expense.id}
                    expense={expense}
                    catColor={catColor}
                    catInfo={catInfo}
                    colors={colors}
                    dateLabel={formatDateFull(expense.date)}
                    onEdit={() => openEdit(expense)}
                    onDelete={() => handleDelete(expense)}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEdit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEdit(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowEdit(false)} hitSlop={8}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Edit Expense
            </Text>
            <Pressable onPress={handleSaveEdit} disabled={editSaving} hitSlop={8}>
              <Text style={[styles.modalSave, { color: GREEN, opacity: editSaving ? 0.5 : 1 }]}>
                {editSaving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Amount */}
            <View style={[styles.editAmountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.editAmountLabel, { color: colors.mutedForeground }]}>AMOUNT</Text>
              <View style={styles.editAmountRow}>
                <Text style={[styles.editCurrencySymbol, { color: colors.primary }]}>₹</Text>
                <TextInput
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editAmountInput, { color: colors.foreground }]}
                  autoFocus
                />
              </View>
            </View>

            {/* Date */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <View style={styles.dateRow}>
                {[
                  { label: "Today", value: todayStr() },
                  { label: "Yesterday", value: yesterdayStr() },
                ].map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setEditDate(opt.value)}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: editDate === opt.value ? BLUE : colors.card,
                        borderColor: editDate === opt.value ? BLUE : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        { color: editDate === opt.value ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
              <CategoryGrid
                categories={allCategories}
                selected={editCategory}
                onSelect={setEditCategory}
              />
            </View>

            {/* Note */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>NOTE</Text>
              <TextInput
                value={editNote}
                onChangeText={setEditNote}
                placeholder="What was this for?"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.noteInput,
                  { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
                ]}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Save button */}
            <Pressable
              onPress={handleSaveEdit}
              disabled={editSaving}
              style={({ pressed }) => [{ opacity: pressed || editSaving ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={[GREEN, "#00A844", "#0D47A1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {editSaving ? "Saving…" : "Save Changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ReceiptCard({
  expense,
  catColor,
  catInfo,
  colors,
  dateLabel,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  catColor: string;
  catInfo: any;
  colors: any;
  dateLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Left color stripe */}
      <View style={[styles.receiptStripe, { backgroundColor: catColor }]} />

      {/* Content */}
      <View style={styles.receiptBody}>
        {/* Top row: category + amount */}
        <View style={styles.receiptTopRow}>
          <View style={styles.receiptCatRow}>
            {catInfo && (
              <View style={[styles.receiptIconBox, { backgroundColor: catColor + "22" }]}>
                <Ionicons name={catInfo.icon as any} size={18} color={catColor} />
              </View>
            )}
            <Text style={[styles.receiptCategory, { color: colors.foreground }]}>
              {expense.category}
            </Text>
          </View>
          <Text style={[styles.receiptAmount, { color: catColor }]}>
            {formatINR(expense.amount)}
          </Text>
        </View>

        {/* Date */}
        <Text style={[styles.receiptDate, { color: colors.mutedForeground }]}>
          {dateLabel}
        </Text>

        {/* Note */}
        {expense.note ? (
          <Text style={[styles.receiptNote, { color: colors.mutedForeground }]} numberOfLines={2}>
            "{expense.note}"
          </Text>
        ) : null}

        {/* Dashed divider */}
        <View style={[styles.receiptDivider, { borderColor: colors.border }]} />

        {/* Actions */}
        <View style={styles.receiptActions}>
          <Text style={[styles.receiptId, { color: colors.mutedForeground }]}>
            #{expense.id.slice(-6).toUpperCase()}
          </Text>
          <View style={styles.receiptBtns}>
            <Pressable
              onPress={onEdit}
              style={[styles.receiptBtn, { backgroundColor: "#1565C022" }]}
            >
              <Ionicons name="pencil-outline" size={14} color={BLUE} />
              <Text style={[styles.receiptBtnText, { color: BLUE }]}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={[styles.receiptBtn, { backgroundColor: "#FF475722" }]}
            >
              <Ionicons name="trash-outline" size={14} color="#FF4757" />
              <Text style={[styles.receiptBtnText, { color: "#FF4757" }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  totalBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  group: {
    gap: 10,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateTotalText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  receiptCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  receiptStripe: {
    width: 4,
  },
  receiptBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  receiptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  receiptCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  receiptIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptCategory: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  receiptAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  receiptDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 38,
  },
  receiptNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginLeft: 38,
    lineHeight: 18,
  },
  receiptDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  receiptActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  receiptId: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  receiptBtns: {
    flexDirection: "row",
    gap: 8,
  },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  receiptBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modalSave: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    gap: 20,
  },
  editAmountCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  editAmountLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  editAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editCurrencySymbol: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  editAmountInput: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    minWidth: 100,
    textAlign: "center",
  },
  editSection: { gap: 10 },
  editSectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  dateRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dateChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dateInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
