import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useAuth } from "@/context/AuthContext";
import {
  Expense,
  ExpenseStatus,
  Income,
  countsTowardSpend,
  currentMonth,
  dateToString,
  formatINR,
  formatMonth,
  useExpenses,
} from "@/context/ExpenseContext";
import { useManager } from "@/context/ManagerContext";
import { useColors } from "@/hooks/useColors";
import { confirmDestructive } from "@/lib/confirm";
import { billDisplayName, isImageBill, pickBillFile } from "@/lib/pickBill";
import { uploadBill } from "@/lib/uploadBill";
import { exportExpensesToExcel } from "@/utils/exportExpenses";
import { StatusBadge } from "@/components/ExpenseItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type BillFilter = "all" | "with_bill" | "no_bill";
type StatusFilter = "all" | ExpenseStatus;
type TypeFilter = "all" | "expense" | "income";

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

function monthChipLabel(month: string): string {
  const parts = formatMonth(month).split(" ");
  // "August 2026" → "Aug 2026" style short
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function RecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { viewingAs, canEdit, canApprove } = useManager();
  const {
    expenses,
    incomes,
    allCategories,
    deleteExpense,
    deleteIncome,
    updateIncome,
    updateExpense,
    setExpenseStatus,
    getCategoryInfo,
  } = useExpenses();

  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string | null>(currentMonth());
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterBill, setFilterBill] = useState<BillFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterType, setFilterType] = useState<TypeFilter>("all");
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBillUri, setEditBillUri] = useState<string | null>(null);
  const [editBillMime, setEditBillMime] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState<string | null>(null);
  const [editBillIsNew, setEditBillIsNew] = useState(false);
  const [editBillCleared, setEditBillCleared] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Cash Surplus edit form state
  const [incomeEditTarget, setIncomeEditTarget] = useState<Income | null>(null);
  const [incomeEditAmount, setIncomeEditAmount] = useState("");
  const [incomeEditSource, setIncomeEditSource] = useState("");
  const [incomeEditNote, setIncomeEditNote] = useState("");
  const [incomeEditDate, setIncomeEditDate] = useState("");
  const [incomeEditSaving, setIncomeEditSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const billOwnerId = viewingAs ?? user?.id;

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonth());
    expenses.forEach((e) => {
      if (e.date?.length >= 7) set.add(e.date.slice(0, 7));
    });
    incomes.forEach((i) => {
      if (i.date?.length >= 7) set.add(i.date.slice(0, 7));
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [expenses, incomes]);

  const chipFilterCount =
    (filterMonth !== null ? 1 : 0) +
    (filterCategory !== null ? 1 : 0) +
    (filterBill !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterType !== "all" ? 1 : 0);

  const hasActiveFilters =
    chipFilterCount > 0 || search.trim().length > 0;

  const clearFilters = () => {
    setSearch("");
    setFilterMonth(null);
    setFilterCategory(null);
    setFilterBill("all");
    setFilterStatus("all");
    setFilterType("all");
  };

  const clearChipFilters = () => {
    setFilterMonth(null);
    setFilterCategory(null);
    setFilterBill("all");
    setFilterStatus("all");
    setFilterType("all");
  };

  // Filter expenses by search + month + category + bill + status
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (filterType === "income") return [];
    return expenses.filter((e) => {
      if (filterMonth && !e.date.startsWith(filterMonth)) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterBill === "with_bill" && !e.billUrl) return false;
      if (filterBill === "no_bill" && e.billUrl) return false;
      if (filterStatus !== "all" && (e.status ?? "approved") !== filterStatus) {
        return false;
      }
      if (
        q &&
        !e.category.toLowerCase().includes(q) &&
        !e.note.toLowerCase().includes(q) &&
        !String(e.amount).includes(q) &&
        !(e.status ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, search, filterMonth, filterCategory, filterBill, filterStatus, filterType]);

  // Cash Surplus entries have no category / bill / status, so those filters
  // hide them unless the user explicitly picks the Cash Surplus type.
  const filteredIncomes = useMemo(() => {
    if (filterType === "expense") return [];
    if (
      filterType === "all" &&
      (filterCategory !== null || filterBill !== "all" || filterStatus !== "all")
    ) {
      return [];
    }
    const q = search.toLowerCase().trim();
    return incomes.filter((i) => {
      if (filterMonth && !i.date.startsWith(filterMonth)) return false;
      if (
        q &&
        !"cash surplus".includes(q) &&
        !(i.source ?? "").toLowerCase().includes(q) &&
        !(i.note ?? "").toLowerCase().includes(q) &&
        !String(i.amount).includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [incomes, search, filterMonth, filterCategory, filterBill, filterStatus, filterType]);

  const filteredIncomeTotal = useMemo(
    () => filteredIncomes.reduce((s, i) => s + i.amount, 0),
    [filteredIncomes]
  );

  // Totals only count approved expenses
  const filteredTotal = useMemo(
    () =>
      filtered
        .filter(countsTowardSpend)
        .reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, { expenses: Expense[]; incomes: Income[] }> = {};
    for (const e of filtered) {
      if (!map[e.date]) map[e.date] = { expenses: [], incomes: [] };
      map[e.date].expenses.push(e);
    }
    for (const i of filteredIncomes) {
      if (!map[i.date]) map[i.date] = { expenses: [], incomes: [] };
      map[i.date].incomes.push(i);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, filteredIncomes]);

  function openEdit(expense: Expense) {
    if (!canEdit) {
      Alert.alert(
        "Read only",
        "You only have view access. Ask the owner for View & Edit permission."
      );
      return;
    }
    setEditTarget(expense);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditNote(expense.note);
    setEditDate(expense.date);
    setEditBillUri(expense.billUrl ?? null);
    setEditBillMime(null);
    setEditBillName(null);
    setEditBillIsNew(false);
    setEditBillCleared(false);
    setShowEdit(true);
  }

  function closeEdit() {
    setShowEdit(false);
    setEditTarget(null);
    setEditBillUri(null);
    setEditBillMime(null);
    setEditBillName(null);
    setEditBillIsNew(false);
    setEditBillCleared(false);
  }

  async function pickEditBill() {
    try {
      const picked = await pickBillFile();
      if (!picked) return;
      setEditBillUri(picked.uri);
      setEditBillMime(picked.mimeType);
      setEditBillName(picked.name);
      setEditBillIsNew(true);
      setEditBillCleared(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      Alert.alert(
        "Could not open file picker",
        err?.message ?? "Please try again."
      );
    }
  }

  function clearEditBill() {
    setEditBillUri(null);
    setEditBillMime(null);
    setEditBillName(null);
    setEditBillIsNew(false);
    setEditBillCleared(true);
  }

  async function handleDelete(expense: Expense) {
    if (!canEdit) {
      Alert.alert(
        "Read only",
        "You only have view access. Ask the owner for View & Edit permission."
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await confirmDestructive(
      "Delete expense?",
      `${expense.category} — ${formatINR(expense.amount)}\n\nThis cannot be undone.`,
      "Delete"
    );
    if (!ok) return;
    await deleteExpense(expense.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleDeleteIncome(income: Income) {
    if (!canEdit) {
      Alert.alert(
        "Read only",
        "You only have view access. Ask the owner for View & Edit permission."
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await confirmDestructive(
      "Delete Cash Surplus?",
      `Remove ${formatINR(income.amount)} (${income.source})?\n\nThis updates your Cash Surplus and Cash Balance. This cannot be undone.`,
      "Delete"
    );
    if (!ok) return;
    await deleteIncome(income.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function openIncomeEdit(income: Income) {
    if (!canEdit) {
      Alert.alert(
        "Read only",
        "You only have view access. Ask the owner for View & Edit permission."
      );
      return;
    }
    setIncomeEditTarget(income);
    setIncomeEditAmount(String(income.amount));
    setIncomeEditSource(income.source ?? "");
    setIncomeEditNote(income.note ?? "");
    setIncomeEditDate(income.date);
  }

  function closeIncomeEdit() {
    setIncomeEditTarget(null);
  }

  async function handleSaveIncomeEdit() {
    if (!incomeEditTarget || !canEdit) return;
    const amount = parseFloat(incomeEditAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than 0.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incomeEditDate)) {
      Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
      return;
    }
    setIncomeEditSaving(true);
    try {
      await updateIncome(incomeEditTarget.id, {
        amount,
        source: incomeEditSource.trim() || "Cash Surplus",
        note: incomeEditNote,
        date: incomeEditDate,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeIncomeEdit();
    } catch (err: any) {
      Alert.alert(
        "Could not save",
        err?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setIncomeEditSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTarget || !user || !billOwnerId) return;
    if (!canEdit) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    setEditSaving(true);
    try {
      let billUrl: string | null = editTarget.billUrl ?? null;
      if (editBillCleared) {
        billUrl = null;
      } else if (editBillIsNew && editBillUri) {
        billUrl = await uploadBill(billOwnerId, editBillUri, editBillMime);
      }

      // Update the same row in place (never delete+recreate — that caused duplicates)
      await updateExpense(editTarget.id, {
        amount,
        category: editCategory,
        note: editNote,
        date: editDate,
        billUrl,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEdit();
    } catch (err: any) {
      Alert.alert(
        "Could not save",
        err?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleApprove(expense: Expense) {
    if (!canApprove) {
      Alert.alert(
        "Full access required",
        "Only Full access managers can approve expenses."
      );
      return;
    }
    try {
      await setExpenseStatus(expense.id, "approved");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Could not approve", err?.message ?? "Please try again.");
    }
  }

  async function handleReject(expense: Expense) {
    if (!canApprove) {
      Alert.alert(
        "Full access required",
        "Only Full access managers can reject expenses."
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await confirmDestructive(
      "Reject expense?",
      `${expense.category} — ${formatINR(expense.amount)}\n\nRejected expenses won't count toward spend totals.`,
      "Reject"
    );
    if (!ok) return;
    try {
      await setExpenseStatus(expense.id, "rejected");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err: any) {
      Alert.alert("Could not reject", err?.message ?? "Please try again.");
    }
  }

  async function handleExport() {
    if (exporting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExporting(true);
    try {
      await exportExpensesToExcel(expenses);
    } catch (err: any) {
      Alert.alert("Export failed", err?.message ?? "Could not export expenses.");
    } finally {
      setExporting(false);
    }
  }

  const totalAll = expenses
    .filter(countsTowardSpend)
    .reduce((s, e) => s + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;

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
          <View style={styles.headerRight}>
            <View style={[styles.totalBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.totalBadgeText, { color: colors.primary }]}>
                {formatINR(hasActiveFilters ? filteredTotal : totalAll)}
                {hasActiveFilters ? " filtered" : " total"}
              </Text>
            </View>
            <Pressable
              onPress={handleExport}
              disabled={exporting || expenses.length === 0}
              style={({ pressed }) => [
                styles.exportBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || exporting || expenses.length === 0 ? 0.6 : 1,
                },
              ]}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={15} color="#fff" />
                  <Text style={styles.exportBtnText}>Export</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by category, note, or amount..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Compact filter trigger */}
        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setShowFilters(true)}
            accessibilityRole="button"
            accessibilityLabel={`Filters${chipFilterCount ? `, ${chipFilterCount} active` : ""}`}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor:
                  chipFilterCount > 0 ? colors.primary + "14" : colors.card,
                borderColor:
                  chipFilterCount > 0 ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={chipFilterCount > 0 ? colors.primary : colors.foreground}
            />
            <Text
              style={[
                styles.filterBtnText,
                {
                  color:
                    chipFilterCount > 0 ? colors.primary : colors.foreground,
                },
              ]}
            >
              Filters
            </Text>
            {chipFilterCount > 0 ? (
              <View
                style={[
                  styles.filterCountBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.filterCountText}>{chipFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>

          {chipFilterCount > 0 ? (
            <Pressable
              onPress={clearChipFilters}
              hitSlop={8}
              style={[
                styles.clearBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Ionicons name="close" size={14} color={colors.mutedForeground} />
              <Text
                style={[styles.clearBtnText, { color: colors.mutedForeground }]}
              >
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Active filter summary chips */}
        {chipFilterCount > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFilterRow}
          >
            {filterType !== "all" ? (
              <Pressable
                onPress={() => setFilterType("all")}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor:
                      (filterType === "income" ? colors.success : colors.primary) + "14",
                    borderColor:
                      (filterType === "income" ? colors.success : colors.primary) + "40",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activeChipText,
                    { color: filterType === "income" ? colors.success : colors.primary },
                  ]}
                >
                  {filterType === "income" ? "Cash Surplus" : "Expenses"}
                </Text>
                <Ionicons
                  name="close"
                  size={12}
                  color={filterType === "income" ? colors.success : colors.primary}
                />
              </Pressable>
            ) : null}
            {filterMonth ? (
              <Pressable
                onPress={() => setFilterMonth(null)}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.primary + "14",
                    borderColor: colors.primary + "40",
                  },
                ]}
              >
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  {monthChipLabel(filterMonth)}
                </Text>
                <Ionicons name="close" size={12} color={colors.primary} />
              </Pressable>
            ) : null}
            {filterCategory ? (
              <Pressable
                onPress={() => setFilterCategory(null)}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.activeChipText, { color: colors.foreground }]}
                >
                  {filterCategory}
                </Text>
                <Ionicons
                  name="close"
                  size={12}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ) : null}
            {filterBill !== "all" ? (
              <Pressable
                onPress={() => setFilterBill("all")}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.activeChipText, { color: colors.foreground }]}
                >
                  {filterBill === "with_bill" ? "With bill" : "No bill"}
                </Text>
                <Ionicons
                  name="close"
                  size={12}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ) : null}
            {filterStatus !== "all" ? (
              <Pressable
                onPress={() => setFilterStatus("all")}
                style={[
                  styles.activeChip,
                  {
                    backgroundColor:
                      filterStatus === "pending"
                        ? colors.warning + "18"
                        : filterStatus === "rejected"
                          ? colors.destructive + "18"
                          : colors.success + "18",
                    borderColor:
                      filterStatus === "pending"
                        ? colors.warning + "40"
                        : filterStatus === "rejected"
                          ? colors.destructive + "40"
                          : colors.success + "40",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activeChipText,
                    {
                      color:
                        filterStatus === "pending"
                          ? colors.warning
                          : filterStatus === "rejected"
                            ? colors.destructive
                            : colors.success,
                      textTransform: "capitalize",
                    },
                  ]}
                >
                  {filterStatus}
                </Text>
                <Ionicons
                  name="close"
                  size={12}
                  color={
                    filterStatus === "pending"
                      ? colors.warning
                      : filterStatus === "rejected"
                        ? colors.destructive
                        : colors.success
                  }
                />
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
          {filtered.length + filteredIncomes.length} record
          {filtered.length + filteredIncomes.length !== 1 ? "s" : ""}
          {filterMonth ? ` · ${formatMonth(filterMonth)}` : ""}
          {filterCategory ? ` · ${filterCategory}` : ""}
          {filterType !== "income"
            ? ` · ${formatINR(hasActiveFilters ? filteredTotal : totalAll)} spent`
            : ""}
          {filteredIncomes.length > 0 ? (
            <Text style={{ color: colors.success }}>
              {` · +${formatINR(filteredIncomeTotal)} surplus`}
            </Text>
          ) : null}
        </Text>
      </View>

      {/* Filter sheet */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View
          style={[
            styles.filterModalRoot,
            {
              backgroundColor: colors.background,
              paddingTop: Platform.OS === "ios" ? 12 : topPad + 8,
              paddingBottom: bottomPad + 16,
            },
          ]}
        >
          <View
            style={[
              styles.filterModalHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Pressable onPress={() => setShowFilters(false)} hitSlop={8}>
              <Text
                style={[styles.filterModalCancel, { color: colors.mutedForeground }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.filterModalTitle, { color: colors.foreground }]}>
              Filters
            </Text>
            <Pressable onPress={() => setShowFilters(false)} hitSlop={8}>
              <Text style={[styles.filterModalDone, { color: colors.primary }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.filterModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text
                style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}
              >
                Type
              </Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All"
                  active={filterType === "all"}
                  onPress={() => setFilterType("all")}
                />
                <FilterChip
                  label="Expenses"
                  active={filterType === "expense"}
                  onPress={() =>
                    setFilterType(filterType === "expense" ? "all" : "expense")
                  }
                />
                <FilterChip
                  label="Cash Surplus"
                  active={filterType === "income"}
                  onPress={() =>
                    setFilterType(filterType === "income" ? "all" : "income")
                  }
                  color={colors.success}
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text
                style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}
              >
                Month
              </Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All months"
                  active={filterMonth === null}
                  onPress={() => setFilterMonth(null)}
                />
                {availableMonths.map((m) => (
                  <FilterChip
                    key={m}
                    label={monthChipLabel(m)}
                    active={filterMonth === m}
                    onPress={() =>
                      setFilterMonth(filterMonth === m ? null : m)
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text
                style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}
              >
                Category
              </Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All categories"
                  active={filterCategory === null}
                  onPress={() => setFilterCategory(null)}
                />
                {allCategories.map((cat) => (
                  <FilterChip
                    key={cat.name}
                    label={cat.name}
                    active={filterCategory === cat.name}
                    onPress={() =>
                      setFilterCategory(
                        filterCategory === cat.name ? null : cat.name
                      )
                    }
                    color={cat.color}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text
                style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}
              >
                Bill
              </Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All bills"
                  active={filterBill === "all"}
                  onPress={() => setFilterBill("all")}
                />
                <FilterChip
                  label="With bill"
                  active={filterBill === "with_bill"}
                  onPress={() =>
                    setFilterBill(
                      filterBill === "with_bill" ? "all" : "with_bill"
                    )
                  }
                />
                <FilterChip
                  label="No bill"
                  active={filterBill === "no_bill"}
                  onPress={() =>
                    setFilterBill(filterBill === "no_bill" ? "all" : "no_bill")
                  }
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text
                style={[styles.filterSectionLabel, { color: colors.mutedForeground }]}
              >
                Status
              </Text>
              <View style={styles.chipWrap}>
                <FilterChip
                  label="All status"
                  active={filterStatus === "all"}
                  onPress={() => setFilterStatus("all")}
                />
                <FilterChip
                  label={
                    pendingCount > 0 ? `Pending (${pendingCount})` : "Pending"
                  }
                  active={filterStatus === "pending"}
                  onPress={() =>
                    setFilterStatus(
                      filterStatus === "pending" ? "all" : "pending"
                    )
                  }
                  color={colors.warning}
                />
                <FilterChip
                  label="Approved"
                  active={filterStatus === "approved"}
                  onPress={() =>
                    setFilterStatus(
                      filterStatus === "approved" ? "all" : "approved"
                    )
                  }
                  color={colors.success}
                />
                <FilterChip
                  label="Rejected"
                  active={filterStatus === "rejected"}
                  onPress={() =>
                    setFilterStatus(
                      filterStatus === "rejected" ? "all" : "rejected"
                    )
                  }
                  color={colors.destructive}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            {chipFilterCount > 0 ? (
              <Pressable
                onPress={clearChipFilters}
                style={[
                  styles.filterClearAll,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <Text
                  style={[
                    styles.filterClearAllText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Clear all
                </Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <PrimaryButton
              label="Show results"
              onPress={() => setShowFilters(false)}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      </Modal>

      {/* List */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? "search-outline" : "receipt-outline"}
            title={hasActiveFilters ? "No matching records" : "No records yet"}
            subtitle={
              hasActiveFilters
                ? "Try another month, category, or clear filters"
                : "Tap + Add to record an expense or Cash Surplus"
            }
            actionLabel={hasActiveFilters ? "Clear filters" : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          grouped.map(([date, { expenses: items, incomes: dayIncomes }]) => (
            <View key={date} style={styles.group}>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                  {formatDate(date)}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                {dayIncomes.length > 0 ? (
                  <Text style={[styles.dateTotalText, { color: colors.success }]}>
                    +{formatINR(dayIncomes.reduce((s, i) => s + i.amount, 0))}
                  </Text>
                ) : null}
                {items.length > 0 ? (
                  <Text style={[styles.dateTotalText, { color: colors.mutedForeground }]}>
                    {formatINR(
                      items
                        .filter(countsTowardSpend)
                        .reduce((s, e) => s + e.amount, 0)
                    )}
                  </Text>
                ) : null}
              </View>

              {/* Cash Surplus cards */}
              {dayIncomes.map((income) => (
                <IncomeCard
                  key={income.id}
                  income={income}
                  dateLabel={formatDateFull(income.date)}
                  canEdit={canEdit}
                  onEdit={() => openIncomeEdit(income)}
                  onDelete={() => handleDeleteIncome(income)}
                />
              ))}

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
                    dateLabel={formatDateFull(expense.date)}
                    canEdit={canEdit}
                    canApprove={canApprove}
                    onEdit={() => openEdit(expense)}
                    onDelete={() => handleDelete(expense)}
                    onApprove={() => handleApprove(expense)}
                    onReject={() => handleReject(expense)}
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
        onRequestClose={closeEdit}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={closeEdit} hitSlop={8}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Edit Expense
            </Text>
            <Pressable onPress={handleSaveEdit} disabled={editSaving} hitSlop={8}>
              <Text style={[styles.modalSave, { color: colors.success, opacity: editSaving ? 0.5 : 1 }]}>
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
                        backgroundColor: editDate === opt.value ? colors.primary : colors.card,
                        borderColor: editDate === opt.value ? colors.primary : colors.border,
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

            {/* Bill upload */}
            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>
                BILL / RECEIPT (OPTIONAL)
              </Text>
              {editBillUri ? (
                <View
                  style={[
                    styles.billPreview,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {isImageBill(editBillUri, editBillMime) ? (
                    <Image source={{ uri: editBillUri }} style={styles.billImage} />
                  ) : (
                    <View
                      style={[
                        styles.billFilePreview,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={36}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.billFileName, { color: colors.foreground }]}
                        numberOfLines={2}
                      >
                        {billDisplayName(editBillUri, editBillName)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.billActions}>
                    <Pressable
                      onPress={pickEditBill}
                      style={[styles.billActionBtn, { backgroundColor: colors.secondary }]}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                      <Text style={[styles.billActionText, { color: colors.primary }]}>
                        Change
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={clearEditBill}
                    style={[styles.billActionBtn, { backgroundColor: colors.destructive + "22" }]}
                  >
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      <Text style={[styles.billActionText, { color: colors.destructive }]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={pickEditBill}
                  style={[
                    styles.billUpload,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.billUploadIcon,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name="document-attach-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.billUploadText}>
                    <Text style={[styles.billUploadTitle, { color: colors.foreground }]}>
                      Upload bill / receipt
                    </Text>
                    <Text
                      style={[styles.billUploadHint, { color: colors.mutedForeground }]}
                    >
                      Images, PDF, or Word/Excel documents
                    </Text>
                  </View>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              )}
            </View>

            {/* Save button */}
            <PrimaryButton
              label={editSaving ? "Saving…" : "Save Changes"}
              onPress={handleSaveEdit}
              loading={editSaving}
              disabled={editSaving}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Cash Surplus Edit Modal */}
      <Modal
        visible={incomeEditTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeIncomeEdit}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={closeIncomeEdit} hitSlop={8}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Edit Cash Surplus
            </Text>
            <Pressable
              onPress={handleSaveIncomeEdit}
              disabled={incomeEditSaving}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.modalSave,
                  { color: colors.success, opacity: incomeEditSaving ? 0.5 : 1 },
                ]}
              >
                {incomeEditSaving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.editAmountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.editAmountLabel, { color: colors.mutedForeground }]}>AMOUNT</Text>
              <View style={styles.editAmountRow}>
                <Text style={[styles.editCurrencySymbol, { color: colors.success }]}>₹</Text>
                <TextInput
                  value={incomeEditAmount}
                  onChangeText={setIncomeEditAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.editAmountInput, { color: colors.foreground }]}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>DATE</Text>
              <View style={styles.dateRow}>
                {[
                  { label: "Today", value: todayStr() },
                  { label: "Yesterday", value: yesterdayStr() },
                ].map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setIncomeEditDate(opt.value)}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: incomeEditDate === opt.value ? colors.primary : colors.card,
                        borderColor: incomeEditDate === opt.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        { color: incomeEditDate === opt.value ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  value={incomeEditDate}
                  onChangeText={setIncomeEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                />
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>SOURCE</Text>
              <TextInput
                value={incomeEditSource}
                onChangeText={setIncomeEditSource}
                placeholder="e.g. Transfer, Salary"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.noteInput,
                  { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
                ]}
              />
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editSectionLabel, { color: colors.mutedForeground }]}>NOTE</Text>
              <TextInput
                value={incomeEditNote}
                onChangeText={setIncomeEditNote}
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

            <PrimaryButton
              label={incomeEditSaving ? "Saving…" : "Save Changes"}
              onPress={handleSaveIncomeEdit}
              loading={incomeEditSaving}
              disabled={incomeEditSaving}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function IncomeCard({
  income,
  dateLabel,
  canEdit,
  onEdit,
  onDelete,
}: {
  income: Income;
  dateLabel: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.receiptCard,
        { backgroundColor: colors.card, borderColor: colors.success + "40" },
      ]}
    >
      <View style={[styles.receiptStripe, { backgroundColor: colors.success }]} />
      <View style={styles.receiptBody}>
        <View style={styles.receiptTopRow}>
          <View style={styles.receiptCatRow}>
            <View
              style={[styles.receiptIconBox, { backgroundColor: colors.success + "22" }]}
            >
              <Ionicons name="arrow-down-circle-outline" size={18} color={colors.success} />
            </View>
            <View style={{ gap: 4, flexShrink: 1 }}>
              <Text
                style={[styles.receiptCategory, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {income.source || "Cash Surplus"}
              </Text>
              <View
                style={[
                  styles.incomeTag,
                  {
                    backgroundColor: colors.success + "18",
                    borderColor: colors.success + "40",
                  },
                ]}
              >
                <Text style={[styles.incomeTagText, { color: colors.success }]}>
                  Cash Surplus
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.receiptAmount, { color: colors.success }]}>
            +{formatINR(income.amount)}
          </Text>
        </View>

        <Text style={[styles.receiptDate, { color: colors.mutedForeground }]}>
          {dateLabel}
        </Text>

        {income.note ? (
          <Text
            style={[styles.receiptNote, { color: colors.mutedForeground }]}
            numberOfLines={2}
          >
            "{income.note}"
          </Text>
        ) : null}

        {canEdit ? (
          <>
            <View style={[styles.receiptDivider, { borderColor: colors.border }]} />
            <View style={[styles.receiptActions, { justifyContent: "flex-end" }]}>
              <Pressable
                onPress={onEdit}
                style={[styles.receiptBtn, { backgroundColor: colors.primary + "18" }]}
                accessibilityRole="button"
                accessibilityLabel="Edit Cash Surplus"
              >
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                <Text style={[styles.receiptBtnText, { color: colors.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                style={[
                  styles.receiptBtn,
                  { backgroundColor: colors.destructive + "22" },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete Cash Surplus"
              >
                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                <Text style={[styles.receiptBtnText, { color: colors.destructive }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function ReceiptCard({
  expense,
  catColor,
  catInfo,
  dateLabel,
  canEdit,
  canApprove,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  expense: Expense;
  catColor: string;
  catInfo: any;
  dateLabel: string;
  canEdit: boolean;
  canApprove: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const colors = useColors();
  const status = expense.status ?? "approved";
  const stripeColor =
    status === "pending"
      ? colors.warning
      : status === "rejected"
        ? colors.destructive
        : catColor;

  return (
    <View
      style={[
        styles.receiptCard,
        {
          backgroundColor: colors.card,
          borderColor:
            status === "pending"
              ? colors.warning + "55"
              : status === "rejected"
                ? colors.destructive + "40"
                : colors.border,
          opacity: status === "rejected" ? 0.82 : 1,
        },
      ]}
    >
      {/* Left color stripe */}
      <View style={[styles.receiptStripe, { backgroundColor: stripeColor }]} />

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
            <View style={{ gap: 4 }}>
              <Text style={[styles.receiptCategory, { color: colors.foreground }]}>
                {expense.category}
              </Text>
              <StatusBadge status={status} size="sm" />
            </View>
          </View>
          <Text
            style={[
              styles.receiptAmount,
              {
                color:
                  status === "rejected" || status === "pending"
                    ? colors.mutedForeground
                    : catColor,
                textDecorationLine:
                  status === "rejected" ? "line-through" : "none",
              },
            ]}
          >
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

        {expense.billUrl ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(expense.billUrl!)}
            style={[styles.billLink, { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="receipt-outline" size={14} color={colors.primary} />
            <Text style={[styles.billLinkText, { color: colors.primary }]}>View bill</Text>
          </Pressable>
        ) : null}

        {/* Dashed divider */}
        <View style={[styles.receiptDivider, { borderColor: colors.border }]} />

        {/* Actions */}
        <View style={styles.receiptActions}>
          <Text style={[styles.receiptId, { color: colors.mutedForeground }]}>
            #{expense.id.slice(-6).toUpperCase()}
          </Text>
          {canEdit || canApprove ? (
            <View style={styles.receiptBtns}>
              {canApprove && status === "pending" ? (
                <>
                  <Pressable
                    onPress={onApprove}
                    style={[styles.receiptBtn, { backgroundColor: colors.success + "22" }]}
                  >
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Text style={[styles.receiptBtnText, { color: colors.success }]}>
                      Approve
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onReject}
                    style={[styles.receiptBtn, { backgroundColor: colors.destructive + "22" }]}
                  >
                    <Ionicons name="close" size={14} color={colors.destructive} />
                    <Text style={[styles.receiptBtnText, { color: colors.destructive }]}>
                      Reject
                    </Text>
                  </Pressable>
                </>
              ) : null}
              {canApprove && status === "rejected" ? (
                <Pressable
                  onPress={onApprove}
                  style={[styles.receiptBtn, { backgroundColor: colors.success + "22" }]}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.success} />
                  <Text style={[styles.receiptBtnText, { color: colors.success }]}>
                    Re-approve
                  </Text>
                </Pressable>
              ) : null}
              {canApprove && status === "approved" ? (
                <Pressable
                  onPress={onReject}
                  style={[styles.receiptBtn, { backgroundColor: colors.destructive + "22" }]}
                >
                  <Ionicons name="close" size={14} color={colors.destructive} />
                  <Text style={[styles.receiptBtnText, { color: colors.destructive }]}>
                    Reject
                  </Text>
                </Pressable>
              ) : null}
              {canEdit ? (
                <>
                  <Pressable
                    onPress={onEdit}
                    style={[styles.receiptBtn, { backgroundColor: colors.primary + "18" }]}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                    <Text style={[styles.receiptBtnText, { color: colors.primary }]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={onDelete}
                    style={[styles.receiptBtn, { backgroundColor: colors.destructive + "22" }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                    <Text style={[styles.receiptBtnText, { color: colors.destructive }]}>Delete</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.receiptId, { color: colors.mutedForeground }]}>
              View only
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    outlineStyle: "none" as any,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
  },
  filterBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  filterCountText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
  },
  clearBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  filterModalRoot: {
    flex: 1,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  filterModalCancel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    minWidth: 64,
  },
  filterModalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  filterModalDone: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    minWidth: 64,
    textAlign: "right",
  },
  filterModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 24,
  },
  filterSection: {
    gap: 10,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterModalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filterClearAll: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterClearAllText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  emptyClear: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyClearText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
    marginBottom: 2,
  },
  receiptStripe: {
    width: 4,
  },
  incomeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  incomeTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  receiptBody: {
    flex: 1,
    padding: 16,
    gap: 8,
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
  billLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginLeft: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  billLinkText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    flex: 1,
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
  billUpload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
    padding: 14,
  },
  billUploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  billUploadText: {
    flex: 1,
    gap: 2,
  },
  billUploadTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  billUploadHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  billPreview: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  billImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  billFilePreview: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  billFileName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  billActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  billActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  billActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
