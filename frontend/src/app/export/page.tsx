"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange, ChartColumn, Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { monthlySummaryCsv, transactionsCsv } from "@/lib/exportData";
import { monthlySummaryExcel, transactionsExcel } from "@/lib/excelExport";
import { downloadReportPdf } from "@/lib/reportPdf";
import { currentMonthString, formatMonth, todayString } from "@/lib/format";
import { Transaction } from "@/types/transactions";
import { Report, ReportSummary } from "@/types/reports";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useFeedback } from "@/components/ui/Feedback";
import { t } from "@/lib/i18n";

type Period = "month" | "3months" | "year" | "all" | "custom";
type Format = "xlsx" | "csv";

const PERIOD_LABELS: Record<Period, string> = {
  month: "This month",
  "3months": "Last 3 months",
  year: "This year",
  all: "All time",
  custom: "Custom dates",
};

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Start / end dates for a period (null = no limit)
function periodRange(period: Period, from: string, to: string): { start: string | null; end: string | null } {
  const month = currentMonthString();
  const today = todayString();
  switch (period) {
    case "month":
      return { start: `${month}-01`, end: today };
    case "3months":
      return { start: `${shiftMonth(month, -2)}-01`, end: today };
    case "year":
      return { start: `${month.slice(0, 4)}-01-01`, end: today };
    case "custom":
      return { start: from || null, end: to || null };
    default:
      return { start: null, end: null };
  }
}

async function fetchTransactions(start: string | null, end: string | null, type = "all") {
  const params = new URLSearchParams();
  if (start) params.set("start_date", start);
  if (end) params.set("end_date", end);
  if (type !== "all") params.set("type", type);
  return api<Transaction[]>(`/api/transactions?${params}`);
}

function ExportCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof FileText;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon size={19} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{text}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </Card>
  );
}

export default function ExportPage() {
  const { money, currency, convert } = useCurrency();
  const { toast } = useFeedback();

  // Transaction history
  const [period, setPeriod] = useState<Period>("month");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [historyBusy, setHistoryBusy] = useState<Format | null>(null);

  // Monthly summary
  const [summaryMonths, setSummaryMonths] = useState("12");
  const [summaryBusy, setSummaryBusy] = useState<Format | null>(null);

  // AI reports
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const range = periodRange(period, from, to);
  const invalidRange = period === "custom" && !!from && !!to && from > to;

  // How many transactions the file will contain
  useEffect(() => {
    if (invalidRange) return;
    let cancelled = false;
    setPreview(null);
    fetchTransactions(range.start, range.end, type)
      .then((list) => !cancelled && setPreview(list.length))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end, type, invalidRange]);

  useEffect(() => {
    api<ReportSummary[]>("/api/reports")
      .then(setReports)
      .catch(() => setReports([]));
  }, []);

  async function downloadHistory(format: Format) {
    setHistoryBusy(format);
    try {
      const list = await fetchTransactions(range.start, range.end, type);
      if (list.length === 0) return toast.error(t("There are no transactions in this period."));
      const label = period === "custom" ? `${range.start ?? "start"}_${range.end ?? "today"}` : period;
      const readable = period === "custom" ? t("From {start} to {end}", { start: range.start ?? t("the start"), end: range.end ?? t("today") }) : t(PERIOD_LABELS[period]);
      if (format === "xlsx") await transactionsExcel(`smartwallet-transactions-${label}.xlsx`, readable, list);
      else transactionsCsv(`smartwallet-transactions-${label}.csv`, list, currency, convert);
      toast.success(t("{count} transactions exported.", { count: list.length }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setHistoryBusy(null);
    }
  }

  async function downloadSummary(format: Format) {
    setSummaryBusy(format);
    try {
      const start = summaryMonths === "all" ? null : `${shiftMonth(currentMonthString(), -(Number(summaryMonths) - 1))}-01`;
      const list = await fetchTransactions(start, null);
      if (list.length === 0) return toast.error(t("There is nothing to summarize yet."));
      const readable = summaryMonths === "all" ? t("All time") : t("Last {count} months", { count: summaryMonths });
      if (format === "xlsx") await monthlySummaryExcel(`smartwallet-monthly-summary-${summaryMonths}.xlsx`, readable, list);
      else monthlySummaryCsv(`smartwallet-monthly-summary-${summaryMonths}.csv`, list);
      toast.success(t("Monthly summary exported."));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSummaryBusy(null);
    }
  }

  async function downloadReport(month: string) {
    setDownloading(month);
    try {
      const report = await api<Report | null>(`/api/reports/${month}`);
      if (!report) return toast.error(t("This report is no longer available."));
      downloadReportPdf(report, money);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="page">
      <PageHeader title={t("Export my data")} subtitle={t("Download your history and summaries to keep or open in Excel.")} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ExportCard
          icon={FileSpreadsheet}
          title={t("Transaction history")}
          text={t("Every income and expense of the period. Excel: colored, with totals and a by-category sheet. CSV: plain data.")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={t("Period")} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="month">{t("This month")}</option>
              <option value="3months">{t("Last 3 months")}</option>
              <option value="year">{t("This year")}</option>
              <option value="all">{t("All time")}</option>
              <option value="custom">{t("Custom dates")}</option>
            </Select>
            <Select label={t("Type")} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">{t("Income and expenses")}</option>
              <option value="income">{t("Income only")}</option>
              <option value="expense">{t("Expenses only")}</option>
            </Select>
          </div>
          {period === "custom" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label={t("From")} type="date" value={from} max={todayString()} onChange={(e) => setFrom(e.target.value)} />
              <Field
                label={t("To")}
                type="date"
                value={to}
                max={todayString()}
                onChange={(e) => setTo(e.target.value)}
                error={invalidRange ? t("Must be after the start date.") : undefined}
              />
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarRange size={14} />
              {invalidRange ? t("Check the dates") : preview === null ? t("Counting...") : t(preview === 1 ? "{count} transaction" : "{count} transactions", { count: preview })}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => downloadHistory("csv")} loading={historyBusy === "csv"} disabled={!!historyBusy || invalidRange || preview === 0}>
                CSV
              </Button>
              <Button size="sm" onClick={() => downloadHistory("xlsx")} loading={historyBusy === "xlsx"} disabled={!!historyBusy || invalidRange || preview === 0}>
                <FileSpreadsheet size={15} />
                {t("Excel")}
              </Button>
            </div>
          </div>
        </ExportCard>

        <ExportCard
          icon={ChartColumn}
          title={t("Monthly summary")}
          text={t("One line per month: income, expenses, balance, share kept and spending per category, with totals.")}
        >
          <Select label={t("Months")} value={summaryMonths} onChange={(e) => setSummaryMonths(e.target.value)}>
            <option value="6">{t("Last 6 months")}</option>
            <option value="12">{t("Last 12 months")}</option>
            <option value="all">{t("All time")}</option>
          </Select>
          <p className="mt-3 rounded-xl bg-background p-3 text-xs text-muted">
            Amounts are in MAD, the currency your data is stored in.
            {currency !== "MAD" && ` ${t("The transaction history also includes a column in your display currency.")}`}
          </p>
          <div className="mt-auto flex justify-end pt-4">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => downloadSummary("csv")} loading={summaryBusy === "csv"} disabled={!!summaryBusy}>
                CSV
              </Button>
              <Button size="sm" onClick={() => downloadSummary("xlsx")} loading={summaryBusy === "xlsx"} disabled={!!summaryBusy}>
                <FileSpreadsheet size={15} />
                {t("Excel")}
              </Button>
            </div>
          </div>
        </ExportCard>

        <div className="lg:col-span-2">
          <ExportCard icon={FileText} title={t("AI monthly reports")} text={t("Your saved reports as PDF files, ready to share or print.")}>
            {reports === null ? (
              <p className="text-sm text-muted">{t("Loading...")}</p>
            ) : reports.length === 0 ? (
              <p className="rounded-xl bg-background p-4 text-sm text-muted">
                No report yet.{" "}
                <Link href="/reports" className="font-semibold text-brand hover:underline">
                  {t("Generate your first report")}
                </Link>
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {reports.map((report) => (
                  <li key={report.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{formatMonth(report.month)}</span>
                      <span className="block truncate text-xs text-muted">
                        {t("{amount} spent", { amount: money(report.expenses) })} · {t("{amount} income", { amount: money(report.income) })}
                      </span>
                    </span>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => downloadReport(report.month)}
                      disabled={downloading !== null}
                      aria-label={t("Download the {month} report as PDF", { month: formatMonth(report.month) })}
                    >
                      {downloading === report.month ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                      PDF
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </ExportCard>
        </div>
      </div>
    </main>
  );
}
