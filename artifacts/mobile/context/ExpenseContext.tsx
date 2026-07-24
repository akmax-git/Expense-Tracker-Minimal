import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  billUrl?: string | null;
  createdAt: string;
}

export interface MonthBudget {
  month: string;
  amount: number;
}

export interface Income {
  id: string;
  amount: number;
  note: string;
  source: string;
  date: string;
  createdAt: string;
}

export interface QuickTemplate {
  id: string;
  label: string;
  category: string;
  amount: number;
}

export interface CategoryInfo {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { name: "Food", icon: "restaurant-outline", color: "#FF9F43" },
  { name: "Coffee", icon: "cafe-outline", color: "#A29BFE" },
  { name: "Transport", icon: "car-outline", color: "#74B9FF" },
  { name: "Shopping", icon: "bag-handle-outline", color: "#FD79A8" },
  { name: "Entertainment", icon: "film-outline", color: "#FDCB6E" },
  { name: "Home", icon: "home-outline", color: "#55EFC4" },
  { name: "Work", icon: "laptop-outline", color: "#00CEC9" },
  { name: "Travel", icon: "airplane-outline", color: "#6C5CE7" },
  { name: "Miscellaneous", icon: "grid-outline", color: "#636E72" },
];

const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [];

const LOCAL_KEYS = {
  QUICK_TEMPLATES: "@exptrack_quick_templates",
  CUSTOM_CATEGORIES: "@exptrack_custom_categories",
};

function customCategoriesKey(userId: string) {
  return `${LOCAL_KEYS.CUSTOM_CATEGORIES}:${userId}`;
}

export function isDefaultCategory(name: string): boolean {
  return DEFAULT_CATEGORIES.some(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase()
  );
}

interface ExpenseContextValue {
  expenses: Expense[];
  incomes: Income[];
  budgets: MonthBudget[];
  quickTemplates: QuickTemplate[];
  customCategories: CategoryInfo[];
  allCategories: CategoryInfo[];
  isLoading: boolean;
  syncError: string | null;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome: (income: Omit<Income, "id" | "createdAt">) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  setMonthBudget: (month: string, amount: number) => Promise<void>;
  /** Effective budget = sum of income entries for the month (no manual target). */
  getMonthBudget: (month: string) => number;
  getMonthIncomeTotal: (month: string) => number;
  getMonthIncomes: (month: string) => Income[];
  /** True when at least one income entry exists for the month. */
  isIncomeDrivenBudget: (month: string) => boolean;
  getMonthExpenses: (month: string) => Expense[];
  getDayExpenses: (date: string) => Expense[];
  addQuickTemplate: (template: Omit<QuickTemplate, "id">) => Promise<void>;
  removeQuickTemplate: (id: string) => Promise<void>;
  addCustomCategory: (info: CategoryInfo) => Promise<string | null>;
  removeCustomCategory: (name: string) => Promise<string | null>;
  getCategoryInfo: (name: string) => CategoryInfo | undefined;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function ExpenseProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<MonthBudget[]>([]);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(
    DEFAULT_QUICK_TEMPLATES
  );
  const [customCategories, setCustomCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setSyncError(null);
      try {
        const { data: expData, error: expError } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (expError) throw expError;

        setExpenses(
          (expData ?? []).map((r: any) => ({
            id: r.id,
            amount: r.amount,
            category: r.category,
            note: r.note ?? "",
            date: r.date,
            billUrl: r.bill_url ?? null,
            createdAt: r.created_at,
          }))
        );

        const { data: budData, error: budError } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", userId);

        if (budError) throw budError;

        setBudgets(
          (budData ?? []).map((r: any) => ({
            month: r.month,
            amount: Number(r.amount),
          }))
        );

        const { data: incData, error: incError } = await supabase
          .from("incomes")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        // Table may not exist until migration is run — don't block the app
        if (incError) {
          const msg = String(incError.message ?? "").toLowerCase();
          const missingTable =
            msg.includes("does not exist") ||
            msg.includes("could not find the table") ||
            msg.includes("schema cache") ||
            incError.code === "42P01" ||
            incError.code === "PGRST205";
          if (!missingTable) {
            setSyncError(incError.message);
          }
          setIncomes([]);
        } else {
          setIncomes(
            (incData ?? []).map((r: any) => ({
              id: r.id,
              amount: Number(r.amount),
              note: r.note ?? "",
              source: r.source ?? "Income",
              date: r.date,
              createdAt: r.created_at,
            }))
          );
        }
      } catch (err: any) {
        setSyncError(err?.message ?? "Failed to load data");
      } finally {
        setIsLoading(false);
      }

      try {
        const [qtStr, ccStr, legacyCcStr] = await Promise.all([
          AsyncStorage.getItem(LOCAL_KEYS.QUICK_TEMPLATES),
          AsyncStorage.getItem(customCategoriesKey(userId)),
          AsyncStorage.getItem(LOCAL_KEYS.CUSTOM_CATEGORIES),
        ]);
        if (qtStr) setQuickTemplates(JSON.parse(qtStr) as QuickTemplate[]);
        if (ccStr) {
          setCustomCategories(JSON.parse(ccStr) as CategoryInfo[]);
        } else if (legacyCcStr) {
          // Migrate older device-wide custom categories into this user
          const migrated = JSON.parse(legacyCcStr) as CategoryInfo[];
          setCustomCategories(migrated);
          AsyncStorage.setItem(
            customCategoriesKey(userId),
            JSON.stringify(migrated)
          ).catch(() => {});
        } else {
          setCustomCategories([]);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [userId]);

  // ─── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`expenses_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as any;
            const newExp: Expense = {
              id: r.id,
              amount: r.amount,
              category: r.category,
              note: r.note ?? "",
              date: r.date,
              billUrl: r.bill_url ?? null,
              createdAt: r.created_at,
            };
            setExpenses((prev) => {
              if (prev.find((e) => e.id === newExp.id)) return prev;
              return [newExp, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setExpenses((prev) =>
              prev.filter((e) => e.id !== (payload.old as any).id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budgets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const r = payload.new as any;
            setBudgets((prev) => [
              ...prev.filter((b) => b.month !== r.month),
              { month: r.month, amount: Number(r.amount) },
            ]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incomes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as any;
            const row: Income = {
              id: r.id,
              amount: Number(r.amount),
              note: r.note ?? "",
              source: r.source ?? "Income",
              date: r.date,
              createdAt: r.created_at,
            };
            setIncomes((prev) => {
              if (prev.find((i) => i.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setIncomes((prev) =>
              prev.filter((i) => i.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ─── Expenses ─────────────────────────────────────────────────────────────

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt">) => {
      const id = generateId();
      const createdAt = new Date().toISOString();
      const newExpense: Expense = { ...expense, id, createdAt };

      setExpenses((prev) => [newExpense, ...prev]);

      const { error } = await supabase.from("expenses").insert({
        id,
        user_id: userId,
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        date: expense.date,
        bill_url: expense.billUrl ?? null,
        created_at: createdAt,
      });

      if (error) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setSyncError(error.message);
      }
    },
    [userId]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        setSyncError(error.message);
        const { data } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        if (data)
          setExpenses(
            data.map((r: any) => ({
              id: r.id,
              amount: r.amount,
              category: r.category,
              note: r.note ?? "",
              date: r.date,
              billUrl: r.bill_url ?? null,
              createdAt: r.created_at,
            }))
          );
      }
    },
    [userId]
  );

  // ─── Budgets & Income ─────────────────────────────────────────────────────

  const getMonthIncomes = useCallback(
    (month: string) => incomes.filter((i) => i.date.startsWith(month)),
    [incomes]
  );

  const getMonthIncomeTotal = useCallback(
    (month: string) =>
      getMonthIncomes(month).reduce((s, i) => s + i.amount, 0),
    [getMonthIncomes]
  );

  const isIncomeDrivenBudget = useCallback(
    (month: string) => getMonthIncomes(month).length > 0,
    [getMonthIncomes]
  );

  const addIncome = useCallback(
    async (income: Omit<Income, "id" | "createdAt">) => {
      const id = generateId();
      const createdAt = new Date().toISOString();
      const newIncome: Income = { ...income, id, createdAt };

      setIncomes((prev) => [newIncome, ...prev]);

      const { error } = await supabase.from("incomes").insert({
        id,
        user_id: userId,
        amount: income.amount,
        note: income.note,
        source: income.source,
        date: income.date,
        created_at: createdAt,
      });

      if (error) {
        setIncomes((prev) => prev.filter((i) => i.id !== id));
        setSyncError(error.message);
        throw new Error(error.message);
      }
    },
    [userId]
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      const previous = incomes;
      setIncomes((prev) => prev.filter((i) => i.id !== id));

      const { error } = await supabase
        .from("incomes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        setIncomes(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }
    },
    [userId, incomes]
  );

  const setMonthBudget = useCallback(
    async (month: string, amount: number) => {
      const previous = budgets;
      setBudgets((prev) => [
        ...prev.filter((b) => b.month !== month),
        { month, amount },
      ]);

      const { error } = await supabase
        .from("budgets")
        .upsert(
          { user_id: userId, month, amount },
          { onConflict: "user_id,month" }
        );

      if (error) {
        setBudgets(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }
    },
    [userId, budgets]
  );

  const getMonthBudget = useCallback(
    (month: string) => getMonthIncomeTotal(month),
    [getMonthIncomeTotal]
  );

  const getMonthExpenses = useCallback(
    (month: string) => expenses.filter((e) => e.date.startsWith(month)),
    [expenses]
  );

  const getDayExpenses = useCallback(
    (date: string) => expenses.filter((e) => e.date === date),
    [expenses]
  );

  // ─── Quick Templates ──────────────────────────────────────────────────────

  const addQuickTemplate = useCallback(
    async (template: Omit<QuickTemplate, "id">) => {
      const newTemplate: QuickTemplate = { ...template, id: generateId() };
      setQuickTemplates((prev) => {
        const updated = [...prev, newTemplate];
        AsyncStorage.setItem(LOCAL_KEYS.QUICK_TEMPLATES, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  const removeQuickTemplate = useCallback(async (id: string) => {
    setQuickTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      AsyncStorage.setItem(LOCAL_KEYS.QUICK_TEMPLATES, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // ─── Custom Categories ────────────────────────────────────────────────────
  // Defaults stay forever (users already have expenses under them).
  // Only user-created categories can be added/removed.

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const addCustomCategory = useCallback(
    async (info: CategoryInfo): Promise<string | null> => {
      const name = info.name.trim();
      if (!name) return "Enter a category name.";
      if (name.length > 24) return "Name must be 24 characters or less.";

      const exists = [...DEFAULT_CATEGORIES, ...customCategories].some(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) return "A category with this name already exists.";

      const next: CategoryInfo = {
        name,
        icon: info.icon || "grid-outline",
        color: info.color || "#636E72",
      };

      const updated = [...customCategories, next];
      setCustomCategories(updated);
      try {
        await AsyncStorage.setItem(
          customCategoriesKey(userId),
          JSON.stringify(updated)
        );
      } catch {
        // keep in-memory even if persist fails
      }
      return null;
    },
    [customCategories, userId]
  );

  const removeCustomCategory = useCallback(
    async (name: string): Promise<string | null> => {
      if (isDefaultCategory(name)) {
        return "Default categories cannot be deleted.";
      }
      const updated = customCategories.filter(
        (c) => c.name.toLowerCase() !== name.trim().toLowerCase()
      );
      if (updated.length === customCategories.length) {
        return "Category not found.";
      }
      setCustomCategories(updated);
      try {
        await AsyncStorage.setItem(
          customCategoriesKey(userId),
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return null;
    },
    [customCategories, userId]
  );

  const getCategoryInfo = useCallback(
    (name: string) =>
      allCategories.find((c) => c.name === name) ?? {
        name,
        icon: "grid-outline",
        color: "#636E72",
      },
    [allCategories]
  );

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        incomes,
        budgets,
        quickTemplates,
        customCategories,
        allCategories,
        isLoading,
        syncError,
        addExpense,
        deleteExpense,
        addIncome,
        deleteIncome,
        setMonthBudget,
        getMonthBudget,
        getMonthIncomeTotal,
        getMonthIncomes,
        isIncomeDrivenBudget,
        getMonthExpenses,
        getDayExpenses,
        addQuickTemplate,
        removeQuickTemplate,
        addCustomCategory,
        removeCustomCategory,
        getCategoryInfo,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpenseProvider");
  return ctx;
}

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string): string {
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function dateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
