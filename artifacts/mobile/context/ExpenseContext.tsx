import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  { id: "qt_coffee", label: "Coffee", category: "Coffee", amount: 120 },
  { id: "qt_lunch", label: "Lunch", category: "Food", amount: 250 },
  { id: "qt_cab", label: "Cab", category: "Transport", amount: 300 },
];

const STORAGE_KEYS = {
  EXPENSES: "@exptrack_expenses",
  BUDGETS: "@exptrack_budgets",
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

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<MonthBudget[]>([]);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>(
    DEFAULT_QUICK_TEMPLATES
  );
  const [customCategories, setCustomCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [expStr, budStr, qtStr, ccStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.EXPENSES),
          AsyncStorage.getItem(STORAGE_KEYS.BUDGETS),
          AsyncStorage.getItem(STORAGE_KEYS.QUICK_TEMPLATES),
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES),
        ]);
        if (expStr) setExpenses(JSON.parse(expStr) as Expense[]);
        if (budStr) setBudgets(JSON.parse(budStr) as MonthBudget[]);
        if (qtStr)
          setQuickTemplates(JSON.parse(qtStr) as QuickTemplate[]);
        else setQuickTemplates(DEFAULT_QUICK_TEMPLATES);
        if (ccStr) setCustomCategories(JSON.parse(ccStr) as CategoryInfo[]);
      } catch {
        // ignore storage errors
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt">) => {
      const newExpense: Expense = {
        ...expense,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => {
        const updated = [newExpense, ...prev];
        AsyncStorage.setItem(
          STORAGE_KEYS.EXPENSES,
          JSON.stringify(updated)
        ).catch(() => {});
        return updated;
      });
    },
    []
  );

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(
        STORAGE_KEYS.EXPENSES,
        JSON.stringify(updated)
      ).catch(() => {});
      return updated;
    });
  }, []);

  const setMonthBudget = useCallback(
    async (month: string, amount: number) => {
      setBudgets((prev) => {
        const updated = [...prev.filter((b) => b.month !== month), { month, amount }];
        AsyncStorage.setItem(
          STORAGE_KEYS.BUDGETS,
          JSON.stringify(updated)
        ).catch(() => {});
        return updated;
      });
    },
    []
  );

  const getMonthBudget = useCallback(
    (month: string) => {
      return budgets.find((b) => b.month === month)?.amount ?? 30000;
    },
    [budgets]
  );

  const getMonthExpenses = useCallback(
    (month: string) => {
      return expenses.filter((e) => e.date.startsWith(month));
    },
    [expenses]
  );

  const getDayExpenses = useCallback(
    (date: string) => {
      return expenses.filter((e) => e.date === date);
    },
    [expenses]
  );

  const addQuickTemplate = useCallback(
    async (template: Omit<QuickTemplate, "id">) => {
      const newTemplate: QuickTemplate = { ...template, id: generateId() };
      setQuickTemplates((prev) => {
        const updated = [...prev, newTemplate];
        AsyncStorage.setItem(
          STORAGE_KEYS.QUICK_TEMPLATES,
          JSON.stringify(updated)
        ).catch(() => {});
        return updated;
      });
    },
    []
  );

  const removeQuickTemplate = useCallback(async (id: string) => {
    setQuickTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      AsyncStorage.setItem(
        STORAGE_KEYS.QUICK_TEMPLATES,
        JSON.stringify(updated)
      ).catch(() => {});
      return updated;
    });
  }, []);

  const addCustomCategory = useCallback(async (info: CategoryInfo) => {
    setCustomCategories((prev) => {
      const updated = [...prev, info];
      AsyncStorage.setItem(
        STORAGE_KEYS.CUSTOM_CATEGORIES,
        JSON.stringify(updated)
      ).catch(() => {});
      return updated;
    });
  }, []);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const getCategoryInfo = useCallback(
    (name: string) => {
      return allCategories.find((c) => c.name === name);
    },
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
