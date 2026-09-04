import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExpenseItem } from "@/components/ExpenseItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import {
  countsTowardSpend,
  formatMonth,
  useExpenses,
} from "@/context/ExpenseContext";
import { useManager } from "@/context/ManagerContext";
import { useColors } from "@/hooks/useColors";

function lastNMonths(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return result;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { canEdit, canApprove } = useManager();
  const {
    expenses,
    allCategories,
    getCategoryInfo,
    deleteExpense,
    setExpenseStatus,
  } = useExpenses();

  const [query, setQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const months = useMemo(() => lastNMonths(6), []);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (filterMonth && !e.date.startsWith(filterMonth)) return false;
        if (filterCategory && e.category !== filterCategory) return false;
        if (
          query.trim() &&
          !e.note.toLowerCase().includes(query.toLowerCase()) &&
          !e.category.toLowerCase().includes(query.toLowerCase())
        )
          return false;
        return true;
      })
      .slice(0, 100);
  }, [expenses, filterMonth, filterCategory, query]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header + search */}
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
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.input, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes or categories…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {/* Month filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <FilterChip
              label="All months"
              active={filterMonth === null}
              onPress={() => setFilterMonth(null)}
            />
            {months.map((m) => (
              <FilterChip
                key={m}
                label={formatMonth(m).split(" ")[0]}
                active={filterMonth === m}
                onPress={() => setFilterMonth(filterMonth === m ? null : m)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Category filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <FilterChip
              label="All"
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
          </ScrollView>
        </View>

        {/* Results count */}
        <View style={[styles.resultRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
          <Text style={[styles.resultTotal, { color: colors.primary }]}>
            {filtered.length > 0
              ? "₹" +
                filtered
                  .filter(countsTowardSpend)
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString("en-IN")
              : ""}
          </Text>
        </View>

        {/* Results list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={
                expenses.length === 0
                  ? "No expenses yet"
                  : "No expenses match your filters"
              }
              subtitle={
                expenses.length === 0
                  ? "Add an expense to see it here"
                  : "Try a different search or filter"
              }
            />
          }
          renderItem={({ item }) => (
            <ExpenseItem
              expense={item}
              category={getCategoryInfo(item.category)}
              onDelete={canEdit ? deleteExpense : undefined}
              canReview={canApprove}
              onApprove={
                canApprove
                  ? (id) => setExpenseStatus(id, "approved")
                  : undefined
              }
              onReject={
                canApprove
                  ? (id) => setExpenseStatus(id, "rejected")
                  : undefined
              }
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
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
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterSection: {
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  resultTotal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
