import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getMonthCashSurplus, getOpeningBalance } from "@/lib/cashFlow";
import { supabase } from "@/lib/supabase";

/** Approval workflow for manager review */
export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  billUrl?: string | null;
  status: ExpenseStatus;
  createdAt: string;
}

export function normalizeExpenseStatus(value: unknown): ExpenseStatus {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  // Legacy rows / missing column → treat as approved so totals stay intact
  return "approved";
}

/** Only approved expenses affect spend, budget remaining, and analytics. */
export function countsTowardSpend(expense: {
  status?: ExpenseStatus | string | null;
}): boolean {
  return normalizeExpenseStatus(expense.status) === "approved";
}

function mapExpenseRow(r: Record<string, unknown>): Expense {
  return {
    id: String(r.id),
    amount: Number(r.amount),
    category: String(r.category),
    note: String(r.note ?? ""),
    date: String(r.date),
    billUrl: (r.bill_url as string | null) ?? null,
    status: normalizeExpenseStatus(r.status),
    createdAt: String(r.created_at),
  };
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
  addExpense: (
    expense: Omit<Expense, "id" | "createdAt" | "status"> & {
      status?: ExpenseStatus;
    }
  ) => Promise<void>;
  updateExpense: (
    id: string,
    expense: Omit<Expense, "id" | "createdAt" | "status"> & {
      status?: ExpenseStatus;
    }
  ) => Promise<void>;
  setExpenseStatus: (id: string, status: ExpenseStatus) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** Pending expenses awaiting manager approval */
  getPendingCount: (month?: string) => number;
  addIncome: (income: Omit<Income, "id" | "createdAt">) => Promise<void>;
  updateIncome: (
    id: string,
    income: Omit<Income, "id" | "createdAt">
  ) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  setMonthBudget: (month: string, amount: number) => Promise<void>;
  /**
   * Cash Surplus for the month = prior Cash Balance carried forward
   * + new surplus entries logged this month.
   */
  getMonthBudget: (month: string) => number;
  /** Leftover Cash Balance from all previous months (carried into this month). */
  getMonthOpeningBalance: (month: string) => number;
  /** New Cash Surplus entries logged in this month only (excludes carry). */
  getMonthIncomeTotal: (month: string) => number;
  getMonthIncomes: (month: string) => Income[];
  /** True when there is carry-forward and/or new surplus this month. */
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

        setExpenses((expData ?? []).map((r: any) => mapExpenseRow(r)));

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
              source: r.source ?? "Cash Surplus",
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

      // Custom categories: Supabase (cloud) + migrate any local AsyncStorage leftovers
      try {
        const [qtStr, ccStr, legacyCcStr] = await Promise.all([
          AsyncStorage.getItem(LOCAL_KEYS.QUICK_TEMPLATES),
          AsyncStorage.getItem(customCategoriesKey(userId)),
          AsyncStorage.getItem(LOCAL_KEYS.CUSTOM_CATEGORIES),
        ]);
        if (qtStr) setQuickTemplates(JSON.parse(qtStr) as QuickTemplate[]);

        const localCats: CategoryInfo[] = [];
        if (ccStr) {
          localCats.push(...(JSON.parse(ccStr) as CategoryInfo[]));
        } else if (legacyCcStr) {
          localCats.push(...(JSON.parse(legacyCcStr) as CategoryInfo[]));
        }

        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("name, icon, color")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        const missingTable =
          catError &&
          (() => {
            const msg = String(catError.message ?? "").toLowerCase();
            return (
              msg.includes("does not exist") ||
              msg.includes("could not find the table") ||
              msg.includes("schema cache") ||
              catError.code === "42P01" ||
              catError.code === "PGRST205"
            );
          })();

        if (catError && !missingTable) {
          setSyncError(catError.message);
        }

        const remoteCats: CategoryInfo[] = (catData ?? []).map((r: any) => ({
          name: r.name as string,
          icon: (r.icon as string) || "grid-outline",
          color: (r.color as string) || "#636E72",
        }));

        // Merge local → remote so old device-only categories aren't lost
        const byName = new Map<string, CategoryInfo>();
        remoteCats.forEach((c) => byName.set(c.name.toLowerCase(), c));
        const toUpload: CategoryInfo[] = [];
        localCats.forEach((c) => {
          const key = c.name.trim().toLowerCase();
          if (!key || isDefaultCategory(c.name)) return;
          if (!byName.has(key)) {
            byName.set(key, c);
            toUpload.push(c);
          }
        });

        const merged = [...byName.values()];
        setCustomCategories(merged);

        if (!missingTable && toUpload.length > 0) {
          await supabase.from("categories").upsert(
            toUpload.map((c) => ({
              id: generateId(),
              user_id: userId,
              name: c.name.trim(),
              icon: c.icon || "grid-outline",
              color: c.color || "#636E72",
            })),
            { onConflict: "user_id,name", ignoreDuplicates: true }
          );
        }

        // Keep a local mirror for offline / before migration
        AsyncStorage.setItem(
          customCategoriesKey(userId),
          JSON.stringify(merged)
        ).catch(() => {});
      } catch {
        // ignore category load errors
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
            const newExp = mapExpenseRow(payload.new as any);
            setExpenses((prev) => {
              if (prev.find((e) => e.id === newExp.id)) return prev;
              return [newExp, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = mapExpenseRow(payload.new as any);
            setExpenses((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
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
              source: r.source ?? "Cash Surplus",
              date: r.date,
              createdAt: r.created_at,
            };
            setIncomes((prev) => {
              if (prev.find((i) => i.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const r = payload.new as any;
            setIncomes((prev) =>
              prev.map((i) =>
                i.id === r.id
                  ? {
                      ...i,
                      amount: Number(r.amount),
                      note: r.note ?? "",
                      source: r.source ?? "Cash Surplus",
                      date: r.date,
                    }
                  : i
              )
            );
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
    async (
      expense: Omit<Expense, "id" | "createdAt" | "status"> & {
        status?: ExpenseStatus;
      }
    ) => {
      const id = generateId();
      const createdAt = new Date().toISOString();
      const status: ExpenseStatus = expense.status ?? "pending";
      const newExpense: Expense = {
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        date: expense.date,
        billUrl: expense.billUrl ?? null,
        status,
        id,
        createdAt,
      };

      setExpenses((prev) => [newExpense, ...prev]);

      const { error } = await supabase.from("expenses").insert({
        id,
        user_id: userId,
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        date: expense.date,
        bill_url: expense.billUrl ?? null,
        status,
        created_at: createdAt,
      });

      if (error) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        const msg = String(error.message ?? "");
        const missingCol =
          msg.toLowerCase().includes("status") &&
          (msg.toLowerCase().includes("column") ||
            error.code === "PGRST204" ||
            error.code === "42703");
        setSyncError(
          missingCol
            ? "Run supabase-migration-expense-status.sql in Supabase to enable approvals."
            : error.message
        );
        throw new Error(
          missingCol
            ? "Approval status column missing. Run the expense-status migration in Supabase."
            : error.message
        );
      }
    },
    [userId]
  );

  const updateExpense = useCallback(
    async (
      id: string,
      expense: Omit<Expense, "id" | "createdAt" | "status"> & {
        status?: ExpenseStatus;
      }
    ) => {
      const previous = expenses;
      const existing = expenses.find((e) => e.id === id);
      if (!existing) {
        throw new Error("Expense not found");
      }

      // Material edits send the expense back for review
      const materialChange =
        existing.amount !== expense.amount ||
        existing.category !== expense.category ||
        existing.date !== expense.date;
      const nextStatus: ExpenseStatus =
        expense.status ??
        (materialChange && existing.status === "approved"
          ? "pending"
          : existing.status);

      const updated: Expense = {
        ...existing,
        amount: expense.amount,
        category: expense.category,
        note: expense.note,
        date: expense.date,
        billUrl: expense.billUrl ?? null,
        status: nextStatus,
      };

      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));

      const { data, error } = await supabase
        .from("expenses")
        .update({
          amount: expense.amount,
          category: expense.category,
          note: expense.note,
          date: expense.date,
          bill_url: expense.billUrl ?? null,
          status: nextStatus,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        setExpenses(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }

      // RLS / wrong id can update 0 rows with no error — treat as failure
      if (!data || data.length === 0) {
        setExpenses(previous);
        const msg = "Could not update expense. Please try again.";
        setSyncError(msg);
        throw new Error(msg);
      }
    },
    [userId, expenses]
  );

  const setExpenseStatus = useCallback(
    async (id: string, status: ExpenseStatus) => {
      const previous = expenses;
      const existing = expenses.find((e) => e.id === id);
      if (!existing) {
        throw new Error("Expense not found");
      }
      if (existing.status === status) return;

      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );

      const { data, error } = await supabase
        .from("expenses")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        setExpenses(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        setExpenses(previous);
        const msg = "Could not update approval status. Please try again.";
        setSyncError(msg);
        throw new Error(msg);
      }
    },
    [userId, expenses]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const previous = expenses;
      setExpenses((prev) => prev.filter((e) => e.id !== id));

      const { data, error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        setExpenses(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        setExpenses(previous);
        const msg = "Could not delete expense. Please try again.";
        setSyncError(msg);
        throw new Error(msg);
      }
    },
    [userId, expenses]
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

  const getMonthOpeningBalance = useCallback(
    (month: string) => getOpeningBalance(month, incomes, expenses),
    [incomes, expenses]
  );

  const isIncomeDrivenBudget = useCallback(
    (month: string) =>
      getMonthOpeningBalance(month) > 0 || getMonthIncomes(month).length > 0,
    [getMonthOpeningBalance, getMonthIncomes]
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

  const updateIncome = useCallback(
    async (id: string, income: Omit<Income, "id" | "createdAt">) => {
      const previous = incomes;
      const existing = incomes.find((i) => i.id === id);
      if (!existing) {
        throw new Error("Cash Surplus entry not found");
      }

      const updated: Income = { ...existing, ...income };
      setIncomes((prev) => prev.map((i) => (i.id === id ? updated : i)));

      const { data, error } = await supabase
        .from("incomes")
        .update({
          amount: income.amount,
          note: income.note,
          source: income.source,
          date: income.date,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        setIncomes(previous);
        setSyncError(error.message);
        throw new Error(error.message);
      }

      // RLS / wrong id can update 0 rows with no error — treat as failure
      if (!data || data.length === 0) {
        setIncomes(previous);
        const msg = "Could not update Cash Surplus. Please try again.";
        setSyncError(msg);
        throw new Error(msg);
      }
    },
    [userId, incomes]
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
    (month: string) => getMonthCashSurplus(month, incomes, expenses),
    [incomes, expenses]
  );

  const getMonthExpenses = useCallback(
    (month: string) => expenses.filter((e) => e.date.startsWith(month)),
    [expenses]
  );

  const getDayExpenses = useCallback(
    (date: string) => expenses.filter((e) => e.date === date),
    [expenses]
  );

  const getPendingCount = useCallback(
    (month?: string) =>
      expenses.filter(
        (e) =>
          e.status === "pending" &&
          (!month || e.date.startsWith(month))
      ).length,
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

      const id = generateId();
      const { error } = await supabase.from("categories").insert({
        id,
        user_id: userId,
        name: next.name,
        icon: next.icon,
        color: next.color,
      });

      if (error) {
        // Roll back memory if cloud save failed (except missing-table → keep local)
        const msg = String(error.message ?? "").toLowerCase();
        const missingTable =
          msg.includes("does not exist") ||
          msg.includes("could not find the table") ||
          msg.includes("schema cache") ||
          error.code === "42P01" ||
          error.code === "PGRST205";
        if (!missingTable) {
          setCustomCategories(customCategories);
          return error.message;
        }
      }

      try {
        await AsyncStorage.setItem(
          customCategoriesKey(userId),
          JSON.stringify(updated)
        );
      } catch {
        // keep in-memory even if local persist fails
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
      const trimmed = name.trim();
      const updated = customCategories.filter(
        (c) => c.name.toLowerCase() !== trimmed.toLowerCase()
      );
      if (updated.length === customCategories.length) {
        return "Category not found.";
      }
      setCustomCategories(updated);

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("user_id", userId)
        .ilike("name", trimmed);

      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        const missingTable =
          msg.includes("does not exist") ||
          msg.includes("could not find the table") ||
          msg.includes("schema cache") ||
          error.code === "42P01" ||
          error.code === "PGRST205";
        if (!missingTable) {
          setCustomCategories(customCategories);
          return error.message;
        }
      }

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
        updateExpense,
        setExpenseStatus,
        deleteExpense,
        addIncome,
        updateIncome,
        deleteIncome,
        setMonthBudget,
        getMonthBudget,
        getMonthOpeningBalance,
        getMonthIncomeTotal,
        getMonthIncomes,
        isIncomeDrivenBudget,
        getMonthExpenses,
        getDayExpenses,
        getPendingCount,
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
