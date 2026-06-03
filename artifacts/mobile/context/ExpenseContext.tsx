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
  createdAt: string;
}

export interface MonthBudget {
  month: string;
  amount: number;
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

interface ExpenseContextValue {
  expenses: Expense[];
  budgets: MonthBudget[];
  quickTemplates: QuickTemplate[];
  customCategories: CategoryInfo[];
  allCategories: CategoryInfo[];
  isLoading: boolean;
  syncError: string | null;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setMonthBudget: (month: string, amount: number) => Promise<void>;
  getMonthBudget: (month: string) => number;
  getMonthExpenses: (month: string) => Expense[];
  getDayExpenses: (date: string) => Expense[];
  addQuickTemplate: (template: Omit<QuickTemplate, "id">) => Promise<void>;
  removeQuickTemplate: (id: string) => Promise<void>;
  addCustomCategory: (info: CategoryInfo) => Promise<void>;
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
            amount: r.amount,
          }))
        );
      } catch (err: any) {
        setSyncError(err?.message ?? "Failed to load data");
      } finally {
        setIsLoading(false);
      }

      try {
        const [qtStr, ccStr] = await Promise.all([
          AsyncStorage.getItem(LOCAL_KEYS.QUICK_TEMPLATES),
          AsyncStorage.getItem(LOCAL_KEYS.CUSTOM_CATEGORIES),
        ]);
        if (qtStr) setQuickTemplates(JSON.parse(qtStr) as QuickTemplate[]);
        if (ccStr) setCustomCategories(JSON.parse(ccStr) as CategoryInfo[]);
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
              { month: r.month, amount: r.amount },
            ]);
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
              createdAt: r.created_at,
            }))
          );
      }
    },
    [userId]
  );

  // ─── Budgets ──────────────────────────────────────────────────────────────

  const setMonthBudget = useCallback(
    async (month: string, amount: number) => {
      setBudgets((prev) => [
        ...prev.filter((b) => b.month !== month),
        { month, amount },
      ]);

      const { error } = await supabase
        .from("budgets")
        .upsert({ user_id: userId, month, amount }, { onConflict: "user_id,month" });

      if (error) setSyncError(error.message);
    },
    [userId]
  );

  const getMonthBudget = useCallback(
    (month: string) => budgets.find((b) => b.month === month)?.amount ?? 30000,
    [budgets]
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

  const addCustomCategory = useCallback(async (info: CategoryInfo) => {
    setCustomCategories((prev) => {
      const updated = [...prev, info];
      AsyncStorage.setItem(LOCAL_KEYS.CUSTOM_CATEGORIES, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const getCategoryInfo = useCallback(
    (name: string) => allCategories.find((c) => c.name === name),
    [allCategories]
  );

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        budgets,
        quickTemplates,
        customCategories,
        allCategories,
        isLoading,
        syncError,
        addExpense,
        deleteExpense,
        setMonthBudget,
        getMonthBudget,
        getMonthExpenses,
        getDayExpenses,
        addQuickTemplate,
        removeQuickTemplate,
        addCustomCategory,
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
