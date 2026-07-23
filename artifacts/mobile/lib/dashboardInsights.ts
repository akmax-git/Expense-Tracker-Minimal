import { formatINR, type Expense } from "@/context/ExpenseContext";

export type PaceStatus = "on_track" | "at_risk" | "over";

export interface CategorySlice {
  label: string;
  value: number;
  percent: number;
}

export interface MonthOverMonthResult {
  current: number;
  previous: number;
  delta: number;
  percentChange: number | null;
}

export interface PaceMetrics {
  status: PaceStatus;
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  daysElapsed: number;
  daysLeft: number;
  daysInMonth: number;
  avgPerDay: number;
  dailyAllowance: number;
  projectedTotal: number;
  projectedOverBy: number;
  isCurrentMonth: boolean;
}

export function monthOffset(base: string, offset: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Days elapsed in month inclusive of today when viewing current month. */
export function daysElapsedInMonth(month: string, today: Date = new Date()): number {
  const [y, m] = month.split("-").map(Number);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (month < todayKey) return daysInMonth(month);
  if (month > todayKey) return 0;
  return today.getDate();
}

export function daysRemainingInMonth(month: string, today: Date = new Date()): number {
  const [y, m] = month.split("-").map(Number);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (month < todayKey) return 0;
  if (month > todayKey) return daysInMonth(month);
  return daysInMonth(month) - today.getDate();
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function categoryBreakdown(
  expenses: Expense[],
  limit?: number
): CategorySlice[] {
  const total = sumExpenses(expenses);
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  });
  const slices = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }));
  return typeof limit === "number" ? slices.slice(0, limit) : slices;
}

export function dailySeriesForMonth(
  expenses: Expense[],
  month: string
): { date: string; amount: number }[] {
  const totalDays = daysInMonth(month);
  const byDate: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.date.startsWith(month)) {
      byDate[e.date] = (byDate[e.date] ?? 0) + e.amount;
    }
  });
  const result: { date: string; amount: number }[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const key = `${month}-${String(day).padStart(2, "0")}`;
    result.push({ date: key, amount: byDate[key] ?? 0 });
  }
  return result;
}

/** Last N calendar days ending at `end` (inclusive), amounts from expenses. */
export function dailySeriesLastNDays(
  expenses: Expense[],
  n: number,
  end: Date = new Date()
): { date: string; amount: number }[] {
  const result: { date: string; amount: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const amount = expenses
      .filter((e) => e.date === key)
      .reduce((s, e) => s + e.amount, 0);
    result.push({ date: key, amount });
  }
  return result;
}

export function monthOverMonth(
  currentSpent: number,
  prevSpent: number
): MonthOverMonthResult {
  const delta = currentSpent - prevSpent;
  let percentChange: number | null = null;
  if (prevSpent > 0) {
    percentChange = (delta / prevSpent) * 100;
  } else if (currentSpent > 0) {
    percentChange = null; // no baseline
  } else {
    percentChange = 0;
  }
  return {
    current: currentSpent,
    previous: prevSpent,
    delta,
    percentChange,
  };
}

export function paceMetrics(opts: {
  spent: number;
  budget: number;
  month: string;
  today?: Date;
}): PaceMetrics {
  const today = opts.today ?? new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = opts.month === todayKey;
  const dim = daysInMonth(opts.month);
  const elapsed = Math.max(daysElapsedInMonth(opts.month, today), 1);
  const left = daysRemainingInMonth(opts.month, today);
  const remaining = opts.budget - opts.spent;
  const percentUsed =
    opts.budget > 0 ? Math.min((opts.spent / opts.budget) * 100, 999) : 0;
  const avgPerDay = opts.spent / elapsed;
  const dailyAllowance =
    isCurrentMonth && left > 0 && remaining > 0 ? remaining / left : 0;
  const projectedTotal = isCurrentMonth
    ? avgPerDay * dim
    : opts.spent;
  const projectedOverBy = Math.max(projectedTotal - opts.budget, 0);

  let status: PaceStatus = "on_track";
  if (opts.spent > opts.budget && opts.budget > 0) {
    status = "over";
  } else if (opts.budget > 0 && percentUsed >= 80) {
    status = "at_risk";
  } else if (
    isCurrentMonth &&
    opts.budget > 0 &&
    projectedTotal > opts.budget
  ) {
    status = "at_risk";
  }

  return {
    status,
    spent: opts.spent,
    budget: opts.budget,
    remaining,
    percentUsed,
    daysElapsed: elapsed,
    daysLeft: left,
    daysInMonth: dim,
    avgPerDay,
    dailyAllowance,
    projectedTotal,
    projectedOverBy,
    isCurrentMonth,
  };
}

export function statusHeadline(
  pace: PaceMetrics,
  isManagerMode: boolean
): { title: string; message: string } {
  const you = isManagerMode ? "Spend is" : "You are";
  const spendVerb = isManagerMode ? "Spend is" : "You're";

  if (pace.budget <= 0) {
    return {
      title: "No budget set",
      message: isManagerMode
        ? "Set a monthly budget to track pace and projections."
        : "Set a monthly budget in settings to track your pace.",
    };
  }

  if (pace.status === "over") {
    return {
      title: "Over budget",
      message: `${spendVerb} over by ${formatINR(Math.abs(pace.remaining))}.`,
    };
  }

  if (pace.status === "at_risk") {
    if (pace.isCurrentMonth && pace.projectedOverBy > 0) {
      return {
        title: "At risk",
        message: isManagerMode
          ? `Projected to exceed budget by ${formatINR(Math.round(pace.projectedOverBy))} at current pace.`
          : `At this pace you'll exceed budget by ${formatINR(Math.round(pace.projectedOverBy))}.`,
      };
    }
    return {
      title: "At risk",
      message: `${you} at ${Math.round(pace.percentUsed)}% of budget used.`,
    };
  }

  if (pace.isCurrentMonth && pace.dailyAllowance > 0) {
    return {
      title: "On track",
      message: isManagerMode
        ? `Safe daily spend: ${formatINR(Math.round(pace.dailyAllowance))} for the next ${pace.daysLeft} days.`
        : `You can spend ${formatINR(Math.round(pace.dailyAllowance))}/day for the next ${pace.daysLeft} days.`,
    };
  }

  return {
    title: "On track",
    message: isManagerMode
      ? `${Math.round(pace.percentUsed)}% of budget used.`
      : `You're on track — ${Math.round(pace.percentUsed)}% of budget used.`,
  };
}
