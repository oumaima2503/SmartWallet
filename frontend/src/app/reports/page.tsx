"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, FileText, RefreshCw, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { currentMonthString, formatDate, formatMonth } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { Report, ReportSummary } from "@/types/reports";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import MonthPicker from "@/components/dashboard/MonthPicker";
import ReportView from "@/components/reports/ReportView";

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
        message: `The saved report for ${formatMonth(month)} will be replaced with a new analysis of your current data.`,
        confirmLabel: "Regenerate",
      });
      if (!ok) return;
    }
    setState("generating");
    setError("");
    try {
      const result = await api<Report>("/api/reports", {
        method: "POST",
        body: JSON.stringify({ month, regenerate }),
      });
      setReport(result);
      setState("ready");
      toast.success(`Report for ${formatMonth(month)} is ready.`);
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
      <PageHeader title="Monthly reports" subtitle="Understand your month with an AI summary of your real numbers.">
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {state === "loading" && (
            <div className="space-y-4">
              <Skeleton className="h-56" />
              <Skeleton className="h-72" />
            </div>
          )}

          {state === "none" && (
            <EmptyState
              icon={FileText}
              title={`No report for ${formatMonth(month)} yet`}
              text="We calculate your income, expenses and budgets for the month, then the AI explains what stands out and suggests what to do next."
              action={
                <Button onClick={() => generate()}>
                  <Sparkles size={18} />
                  Generate report
                </Button>
              }
            />
          )}

          {state === "generating" && (
            <Card>
              <div className="flex flex-col items-center py-14 text-center" role="status">
                <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <Sparkles size={26} />
                </span>
                <h2 className="mt-4 font-semibold text-ink">Analyzing {formatMonth(month)}...</h2>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  Calculating your statistics and writing your report. This can take up to 30 seconds.
                </p>
              </div>
            </Card>
          )}

          {state === "error" && (
            <ErrorState message={error} onRetry={failedAction === "load" ? loadReport : () => generate()} />
          )}

          {state === "unavailable" && (
            <EmptyState
              icon={CloudOff}
              title="AI reports are unavailable right now"
              text={error}
              action={
                <Button variant="secondary" onClick={() => generate()}>
                  <RefreshCw size={16} />
                  Try again
                </Button>
              }
            />
          )}

          {state === "ready" && report && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <span>Generated on {formatDate(report.created_at.slice(0, 10))}</span>
                <Button size="sm" variant="secondary" onClick={() => generate(true)}>
                  <RefreshCw size={14} />
                  Regenerate
                </Button>
              </div>
              <ReportView report={report} />
            </>
          )}
        </div>

        <aside className="lg:col-span-1">
          <Card title="Saved reports">
            {history.length === 0 ? (
              <p className="text-sm text-muted">Your reports will be listed here.</p>
            ) : (
              <ul className="-mx-2 space-y-1">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setMonth(item.month)}
                      aria-current={item.month === month}
                      className={`w-full rounded-xl px-3 py-2 text-left transition ${
                        item.month === month ? "bg-brand-soft" : "hover:bg-background"
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">{formatMonth(item.month)}</p>
                      <p className="text-xs text-muted">{money(item.expenses)} spent</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}
