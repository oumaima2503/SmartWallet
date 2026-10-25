import type { Workbook, Worksheet } from "exceljs";
import { Transaction } from "@/types/transactions";

// Styled Excel files (colors, money format, totals, frozen header, filters).
// ExcelJS is loaded only when the user exports, to keep the app light.

const GREEN = "FF0A8F4F";
const GREEN_DARK = "FF07683A";
const GREEN_SOFT = "FFE6F5EC";
const ROSE = "FFE11D48";
const ZEBRA = "FFF6F9F7";
const MUTED = "FF6B7A72";
const MONEY = '#,##0.00 "MAD"';

async function newWorkbook() {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartWallet";
  workbook.created = new Date();
  return workbook;
}

async function download(workbook: Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Big green title row + grey subtitle row on top of a sheet
function addTitle(sheet: Worksheet, title: string, subtitle: string, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
  titleCell.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, columns);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { italic: true, size: 10, color: { argb: MUTED } };
  subtitleCell.alignment = { indent: 1 };
  sheet.getRow(2).height = 18;
}

function styleHeader(sheet: Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}

function zebra(sheet: Worksheet, from: number, to: number) {
  for (let r = from; r <= to; r++) {
    if ((r - from) % 2 === 1) {
      sheet.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      });
    }
  }
}

function totalRow(sheet: Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true };
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_SOFT } };
    cell.border = { top: { style: "thin", color: { argb: GREEN } } };
  });
}

// Transaction history: one line per transaction, totals, and a second sheet "By category"
export async function transactionsExcel(fileName: string, periodLabel: string, transactions: Transaction[]) {
  const workbook = await newWorkbook();
  const sheet = workbook.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 3 }] });

  sheet.columns = [
    { key: "date", width: 13 },
    { key: "type", width: 11 },
    { key: "category", width: 18 },
    { key: "merchant", width: 24 },
    { key: "description", width: 32 },
    { key: "amount", width: 16 },
  ];
  addTitle(sheet, "SmartWallet · Transaction history", `${periodLabel} · ${transactions.length} transactions · amounts in MAD`, 6);
  sheet.getRow(3).values = ["Date", "Type", "Category", "Store / from", "Description", "Amount"];
  styleHeader(sheet, 3);

  transactions.forEach((t) => {
    const row = sheet.addRow({
      date: new Date(`${t.date}T00:00:00`),
      type: t.type === "income" ? "Income" : "Expense",
      category: t.category_name,
      merchant: t.merchant ?? "",
      description: t.description ?? "",
      // Expenses are negative so the total is the balance
      amount: (t.type === "income" ? 1 : -1) * Number(t.amount),
    });
    row.getCell("date").numFmt = "dd/mm/yyyy";
    row.getCell("amount").numFmt = MONEY;
    row.getCell("amount").font = { bold: true, color: { argb: t.type === "income" ? GREEN : ROSE } };
    row.getCell("type").font = { color: { argb: t.type === "income" ? GREEN : ROSE } };
  });

  const first = 4;
  const last = sheet.rowCount;
  zebra(sheet, first, last);
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: last, column: 6 } };

  // Totals with live formulas
  const totals = [
    ["Income", `SUMIF(B${first}:B${last},"Income",F${first}:F${last})`],
    ["Expenses", `-SUMIF(B${first}:B${last},"Expense",F${first}:F${last})`],
    ["Balance", `SUM(F${first}:F${last})`],
  ];
  sheet.addRow([]);
  for (const [label, formula] of totals) {
    const row = sheet.addRow(["", "", "", "", label, { formula }]);
    row.getCell(6).numFmt = MONEY;
    totalRow(sheet, row.number);
  }

  // Second sheet: spending per category
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "expense") byCategory.set(t.category_name, (byCategory.get(t.category_name) ?? 0) + Number(t.amount));
  }
  const categories = workbook.addWorksheet("By category", { views: [{ state: "frozen", ySplit: 3 }] });
  categories.columns = [
    { key: "category", width: 22 },
    { key: "total", width: 16 },
    { key: "share", width: 12 },
  ];
  addTitle(categories, "Spending by category", periodLabel, 3);
  categories.getRow(3).values = ["Category", "Spent", "Share"];
  styleHeader(categories, 3);
  const totalSpent = [...byCategory.values()].reduce((sum, v) => sum + v, 0);
  [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, total]) => {
      const row = categories.addRow({ category: name, total, share: totalSpent ? total / totalSpent : 0 });
      row.getCell("total").numFmt = MONEY;
      row.getCell("share").numFmt = "0.0%";
    });
  zebra(categories, 4, categories.rowCount);
  const sumRow = categories.addRow({ category: "Total", total: totalSpent, share: 1 });
  sumRow.getCell("total").numFmt = MONEY;
  sumRow.getCell("share").numFmt = "0.0%";
  totalRow(categories, sumRow.number);

  await download(workbook, fileName);
}

// One line per month: income, expenses, balance, % kept and each category
export async function monthlySummaryExcel(fileName: string, periodLabel: string, transactions: Transaction[]) {
  const months = new Map<string, { income: number; expenses: number; categories: Map<string, number> }>();
  const names = new Set<string>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (!months.has(month)) months.set(month, { income: 0, expenses: 0, categories: new Map() });
    const entry = months.get(month)!;
    if (t.type === "income") entry.income += Number(t.amount);
    else {
      entry.expenses += Number(t.amount);
      entry.categories.set(t.category_name, (entry.categories.get(t.category_name) ?? 0) + Number(t.amount));
      names.add(t.category_name);
    }
  }
  const categoryNames = [...names].sort();

  const workbook = await newWorkbook();
  const sheet = workbook.addWorksheet("Monthly summary", { views: [{ state: "frozen", ySplit: 3, xSplit: 1 }] });
  const columns = 5 + categoryNames.length;
  sheet.columns = [
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    ...categoryNames.map(() => ({ width: 15 })),
  ];
  addTitle(sheet, "SmartWallet · Monthly summary", `${periodLabel} · amounts in MAD`, columns);
  sheet.getRow(3).values = ["Month", "Income", "Expenses", "Balance", "Kept", ...categoryNames];
  styleHeader(sheet, 3);

  [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([month, entry]) => {
      const balance = entry.income - entry.expenses;
      const row = sheet.addRow([
        month,
        entry.income,
        entry.expenses,
        balance,
        entry.income > 0 ? balance / entry.income : null,
        ...categoryNames.map((name) => entry.categories.get(name) ?? 0),
      ]);
      for (let c = 2; c <= columns; c++) if (c !== 5) row.getCell(c).numFmt = MONEY;
      row.getCell(5).numFmt = "0%";
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { color: { argb: GREEN } };
      row.getCell(3).font = { color: { argb: ROSE } };
      row.getCell(4).font = { bold: true, color: { argb: balance >= 0 ? GREEN : ROSE } };
    });

  const last = sheet.rowCount;
  zebra(sheet, 4, last);
  const total = sheet.addRow([
    "Total",
    ...Array.from({ length: columns - 1 }, (_, i) => {
      const col = i + 2;
      if (col === 5) return null;
      const letter = sheet.getColumn(col).letter;
      return { formula: `SUM(${letter}4:${letter}${last})` };
    }),
  ]);
  for (let c = 2; c <= columns; c++) if (c !== 5) total.getCell(c).numFmt = MONEY;
  totalRow(sheet, total.number);

  await download(workbook, fileName);
}
