"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { DashboardData } from "@/types/dashboard";

const STORAGE_KEY = "smartwallet.checklist.hidden";

// First-run checklist: the 4 things that make the app useful. Hidden when done or dismissed.
export default function GettingStarted({ data }: { data: DashboardData }) {
  const { t } = useT();
  const [hidden, setHidden] = useState(true);
  const [hasReceipt, setHasReceipt] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHidden(false);
    }
    api<unknown[]>("/api/receipts")
      .then((list) => setHasReceipt(list.length > 0))
      .catch(() => setHasReceipt(false));
  }, []);

  const steps = [
    { label: "Add your income", href: "/transactions", done: data.monthly_trend.some((row) => row.income > 0) },
    { label: "Set a monthly budget", href: "/budgets", done: !!data.budgets.overall || data.budgets.categories.length > 0 },
    { label: "Scan a receipt", href: "/receipts", done: !!hasReceipt },
    { label: "Create a savings goal", href: "/goals", done: data.savings.goals.length > 0 },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  if (hidden || hasReceipt === null || doneCount === steps.length) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  return (
    <section className="relative rounded-2xl border border-brand/20 bg-brand-soft/60 p-4">
      <button onClick={dismiss} aria-label={t("Hide the checklist")} className="absolute end-3 top-3 rounded-lg p-1 text-muted transition hover:bg-white hover:text-ink">
        <X size={16} />
      </button>
      <div className="flex flex-wrap items-center gap-3 pe-8">
        <h2 className="text-sm font-semibold text-ink">{t("Get started with SmartWallet")}</h2>
        <span className="text-xs text-muted">
          {t("{done} of {total} done", { done: doneCount, total: steps.length })}
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white">
          <div className="fill-in h-full rounded-full bg-brand" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                step.done ? "border-transparent bg-white/50 text-muted" : "border-line bg-white text-ink hover:border-brand/40 hover:shadow-sm"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done ? "bg-brand text-white" : "bg-brand-soft text-brand"
                }`}
              >
                {step.done ? <Check size={14} /> : i + 1}
              </span>
              <span className={`flex-1 ${step.done ? "line-through" : "font-medium"}`}>{t(step.label)}</span>
              {!step.done && <ChevronRight size={16} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand rtl:group-hover:-translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
