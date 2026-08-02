/** Pure cash-flow helpers (no React / context imports). */

export function monthOffset(base: string, offset: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type DatedAmount = { date: string; amount: number };

/** YYYY-MM from a YYYY-MM-DD (or YYYY-MM) string. */
export function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

/**
 * Opening Cash Balance for `month` = leftover from all prior months
 * (each month: balance = max(0, balance + surplusIn − spent)).
 * Carries July's remaining Cash Balance into August, etc.
 */
export function getOpeningBalance(
  month: string,
  incomes: DatedAmount[],
  expenses: DatedAmount[]
): number {
  const months = new Set<string>();
  incomes.forEach((i) => {
    if (i.date) months.add(monthKeyFromDate(i.date));
  });
  expenses.forEach((e) => {
    if (e.date) months.add(monthKeyFromDate(e.date));
  });
  if (months.size === 0) return 0;

  const earliest = [...months].sort()[0];
  if (!earliest || earliest >= month) return 0;

  let balance = 0;
  let m = earliest;
  for (let i = 0; i < 240 && m < month; i++) {
    const surplusIn = incomes
      .filter((row) => row.date.startsWith(m))
      .reduce((s, row) => s + row.amount, 0);
    const spent = expenses
      .filter((row) => row.date.startsWith(m))
      .reduce((s, row) => s + row.amount, 0);
    balance = Math.max(0, balance + surplusIn - spent);
    m = monthOffset(m, 1);
  }
  return balance;
}

/** Cash Surplus for the month = opening carry + new surplus entries that month. */
export function getMonthCashSurplus(
  month: string,
  incomes: DatedAmount[],
  expenses: DatedAmount[]
): number {
  const opening = getOpeningBalance(month, incomes, expenses);
  const added = incomes
    .filter((row) => row.date.startsWith(month))
    .reduce((s, row) => s + row.amount, 0);
  return opening + added;
}
