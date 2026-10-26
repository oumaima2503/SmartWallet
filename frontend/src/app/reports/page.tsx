"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { currentMonthString, formatMonth } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { downloadReportPdf } from "@/lib/reportPdf";
import { Report, ReportSummary } from "@/types/reports";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import MonthPicker from "@/components/dashboard/MonthPicker";
import ReportView from "@/components/reports/ReportView";
import Hero from "@/components/ui/Hero";
import { currentLanguage, t } from "@/lib/i18n";

type State = "loading" | "none" | "generating" | "ready" | "error" | "unavailable";

export default function ReportsPage() {
  const { money } = useCurrency();
  const { toast, confirm } = useFeedback();
  const [month, setMonth] = useState(currentMonthString());
  const [state, setState] = useState<State>("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  // What "Try again" should redo
  const [failedAction, setFailedAction] = useState<"load" | "generate">("load");
  const [history, setHistory] = useState<ReportSummary[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await api<ReportSummary[]>("/api/reports"));
    } catch {
      // The list is optional, the page still works without it
    }
  }, []);

  // Reopens a saved report (no AI call). The API returns null when the month has no report yet.
  const loadReport = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const saved = await api<Report | null>(`/api/reports/${month}`);
      setReport(saved);
      setState(saved ? "ready" : "none");
    } catch (err) {
      setReport(null);
      setError((err as Error).message);
      setFailedAction("load");
      setState("error");
    }
  }, [month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function generate(regenerate = false) {
    if (regenerate) {
      const ok = await confirm({
        title: "Create a new report?",
        message: t("The saved report for {month} will be replaced with a new analysis of your current data.", { month: formatMonth(month) }),
        confirmLabel: t("Regenerate"),
      });
      if (!ok) return;
    }
    setState("generating");
    setError("");
    try {
      const result = await api<Report>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ month, regenerate, language: currentLanguage() }),
      });
      setReport(result);
      setState("ready");
      toast.success(t("Report for {month} is ready.", { month: formatMonth(month) }));
      loadHistory();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const message =
        status === 503
          ? "The AI assistant is not available right now. Your transactions and budgets are not affected."
          : (err as Error).message;
      if (report) {
        // Keep showing the saved report, just tell what went wrong
        setState("ready");
        toast.error(message);
      } else {
        setError(message);
        setFailedAction("generate");
        setState(status === 503 ? "unavailable" : "error");
      }
    }
  }

  return (
    <main className="page">
      <PageHeader title={t("AI reports")} subtitle={t("An AI summary of your real numbers, month by month.")}>
        <MonthPicker value={month} onChange={setMonth} compact />
      </PageHeader>

      {/* Saved reports: one chip per month */}
      {history.length > 0 && (
        <div className="thin-scroll -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label={t("Saved reports")}>
          {history.map((item) => {
            const active = item.month === month;
            return (
              <button
                key={item.id}
                onClick={() => setMonth(item.month)}
                aria-current={active}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                  active ? "border-violet-600 bg-violet-600 text-white" : "border-line bg-white text-ink hover:border-violet-300"
                }`}
              >
                <FileText size={13} className={active ? "text-white" : "text-violet-600"} />
                <span className="font-semibold">{formatMonth(item.month)}</span>
                <span className={active ? "text-white/75" : "text-muted"}>{money(item.expenses)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4" data-tour="report-main">
        {state === "loading" && (
          <div className="space-y-4">
            <Skeleton className="h-60 rounded-2xl" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        )}

        {state === "none" && (
          <Hero tone="violet" className="sm:!p-8">
            <div className="relative max-w-xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <Sparkles size={22} />
              </span>
              <h2 className="mt-4 text-xl font-bold">No report for {formatMonth(month)} yet</h2>
              <p className="mt-1 text-sm text-white/80">
                {t("We calculate your income, expenses and budgets for the month. Then the AI explains what stands out and suggests what to do next.")}
              </p>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                {["Main spending categories", "Budgets close to the limit", "Tips based on real numbers"].map((text) => (
                  <li key={text} className="rounded-xl bg-white/12 px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                    {text}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => generate()}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
              >
                <Sparkles size={16} />
                {t("Generate report")}
              </button>
            </div>
          </Hero>
        )}

        {state === "generating" && (
          <Card>
            <div className="flex flex-col items-center py-14 text-center" role="status">
              <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Sparkles size={26} />
              </span>
              <h2 className="mt-4 font-semibold text-ink">Analyzing {formatMonth(month)}...</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">{t("Calculating your statistics and writing your report. This can take up to 30 seconds.")}</p>
            </div>
          </Card>
        )}

        {state === "error" && <ErrorState message={error} onRetry={failedAction === "load" ? loadReport : () => generate()} />}

        {state === "unavailable" && (
          <EmptyState
            icon={CloudOff}
            title={t("AI reports are unavailable right now")}
            text={error}
            action={
              <Button variant="secondary" onClick={() => generate()}>
                <RefreshCw size={16} />
                {t("Try again")}
              </Button>
            }
          />
        )}

        {state === "ready" && report && (
          <ReportView
            report={report}
            actions={
              <>
                <button
                  onClick={() => generate(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold text-white transition hover:bg-white/25"
                >
                  <RefreshCw size={13} />
                  {t("Regenerate")}
                </button>
                <button
                  onClick={() => downloadReportPdf(report, money)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                >
                  <Download size={13} />
                  {t("Download PDF")}
                </button>
              </>
            }
          />
        )}
      </div>
    </main>
  );
}
