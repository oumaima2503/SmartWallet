import { Transaction } from "@/types/transactions";

// CSV files the user can download (opened fine by Excel / Google Sheets)

function cell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(fileName: string, header: string[], rows: (string | number | null)[][]) {
  // BOM so Excel opens accents correctly
  const content = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// Transaction history. Amounts in MAD (as stored) and in the display currency when different
export function transactionsCsv(
  fileName: string,
  transactions: Transaction[],
  currency: string,
  convert: (amountMad: number) => number
) {
  const extra = currency !== "MAD";
  downloadCsv(
    fileName,
    ["date", "type", "category", "merchant", "description", "amount_mad", ...(extra ? [`amount_${currency.toLowerCase()}`] : [])],
    transactions.map((t) => [
      t.date,
      t.type,
      t.category_name,
      t.merchant,
      t.description,
      Number(t.amount),
      ...(extra ? [round2(convert(Number(t.amount)))] : []),
    ])
  );
}

// One row per month: income, expenses, balance, savings rate and the spending of each category
export function monthlySummaryCsv(fileName: string, transactions: Transaction[]) {
  const months = new Map<string, { income: number; expenses: number; categories: Map<string, number> }>();
  const categoryNames = new Set<string>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (!months.has(month)) months.set(month, { income: 0, expenses: 0, categories: new Map() });
    const row = months.get(month)!;
    const amount = Number(t.amount);
    if (t.type === "income") {
      row.income += amount;
    } else {
      row.expenses += amount;
      row.categories.set(t.category_name, (row.categories.get(t.category_name) ?? 0) + amount);
      categoryNames.add(t.category_name);
    }
  }

  const categories = [...categoryNames].sort();
  const rows = [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, row]) => [
      month,
      round2(row.income),
      round2(row.expenses),
      round2(row.income - row.expenses),
      row.income > 0 ? Math.round(((row.income - row.expenses) / row.income) * 1000) / 10 : null,
      ...categories.map((name) => round2(row.categories.get(name) ?? 0)),
    ]);

  downloadCsv(
    fileName,
    ["month", "income_mad", "expenses_mad", "balance_mad", "kept_percent", ...categories.map((name) => `${name}_mad`)],
    rows
  );
}
