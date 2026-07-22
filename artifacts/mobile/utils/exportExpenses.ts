import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

export interface ExportableExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

export async function exportExpensesToExcel(
  expenses: ExportableExpense[],
  ownerEmail?: string
): Promise<void> {
  if (expenses.length === 0) {
    throw new Error("No expenses to export.");
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: All Expenses ─────────────────────────────────────
  const expenseRows = [
    ["#", "Date", "Day", "Category", "Amount (₹)", "Note"],
    ...expenses
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e, i) => [
        i + 1,
        formatDate(e.date),
        formatWeekday(e.date),
        e.category,
        e.amount,
        e.note || "",
      ]),
  ];

  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);

  // Column widths
  wsExpenses["!cols"] = [
    { wch: 5 },  // #
    { wch: 14 }, // Date
    { wch: 12 }, // Day
    { wch: 18 }, // Category
    { wch: 14 }, // Amount
    { wch: 36 }, // Note
  ];

  // Bold header row
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "1565C0" } } };
  ["A1", "B1", "C1", "D1", "E1", "F1"].forEach((cell) => {
    if (wsExpenses[cell]) wsExpenses[cell].s = headerStyle;
  });

  XLSX.utils.book_append_sheet(wb, wsExpenses, "All Expenses");

  // ── Sheet 2: Category Summary ─────────────────────────────────
  const categoryMap: Record<string, { count: number; total: number }> = {};
  for (const e of expenses) {
    if (!categoryMap[e.category]) categoryMap[e.category] = { count: 0, total: 0 };
    categoryMap[e.category].count += 1;
    categoryMap[e.category].total += e.amount;
  }

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryRows = [
    ["Category", "No. of Expenses", "Total Amount (₹)", "% of Spend"],
    ...Object.entries(categoryMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, { count, total }]) => [
        cat,
        count,
        total,
        Number(((total / grandTotal) * 100).toFixed(1)),
      ]),
    ["TOTAL", expenses.length, grandTotal, 100],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(categoryRows);
  wsSummary["!cols"] = [
    { wch: 18 }, // Category
    { wch: 18 }, // Count
    { wch: 18 }, // Total
    { wch: 14 }, // %
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, "Category Summary");

  // ── Sheet 3: Monthly Summary ──────────────────────────────────
  const monthMap: Record<string, { count: number; total: number }> = {};
  for (const e of expenses) {
    const month = e.date.slice(0, 7); // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { count: 0, total: 0 };
    monthMap[month].count += 1;
    monthMap[month].total += e.amount;
  }

  const monthRows = [
    ["Month", "No. of Expenses", "Total Spent (₹)"],
    ...Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, { count, total }]) => {
        const [year, m] = month.split("-");
        const label = new Date(Number(year), Number(m) - 1, 1).toLocaleDateString(
          "en-IN",
          { month: "long", year: "numeric" }
        );
        return [label, count, total];
      }),
  ];

  const wsMonthly = XLSX.utils.aoa_to_sheet(monthRows);
  wsMonthly["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 16 }];

  XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Summary");

  // ── Write & Share ─────────────────────────────────────────────
  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const filename = `expenses_${stamp}.xlsx`;
  const fileUri = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      "Sharing is not available on this device. Try on a physical phone."
    );
  }

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Save or share your expense report",
    UTI: "com.microsoft.excel.xlsx",
  });
}
