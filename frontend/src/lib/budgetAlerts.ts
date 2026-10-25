"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { currentMonthString } from "@/lib/format";
import { Budget } from "@/types/transactions";

// Budget alerts for the current month, computed from the budgets API:
// - a category reaches 80% of its limit
// - a category goes over its limit
// - total spending goes over the overall budget

export type BudgetAlert = {
  // Changes when the level changes, so "over" is a new alert after "80%"
  key: string;
  level: "warning" | "exceeded";
  title: string;
  budget: Budget;
};

const SEEN_KEY = "smartwallet.alerts.seen";
const REFRESH_MS = 5 * 60 * 1000;

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function toAlerts(budgets: Budget[]): BudgetAlert[] {
  return budgets
    .map((budget): BudgetAlert | null => {
      const used = Number(budget.percentage_used);
      const level = used > 100 ? "exceeded" : used >= 80 ? "warning" : null;
      if (!level) return null;
      const name = budget.category_name ?? "Overall budget";
      const title =
        level === "exceeded"
          ? budget.category_id === null
            ? "Your total spending is over the monthly budget"
            : `${name} is over its limit`
          : `${name} reached ${Math.round(used)}% of its budget`;
      return { key: `${budget.month}:${budget.id}:${level}`, level, title, budget };
    })
    .filter((alert): alert is BudgetAlert => alert !== null)
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "exceeded" ? -1 : 1));
}

export function useBudgetAlerts() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [seen, setSeen] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      setAlerts(toAlerts(await api<Budget[]>(`/api/budgets?month=${currentMonthString()}`)));
    } catch {
      // Alerts are a bonus: never break the page for them
    }
  }, []);

  useEffect(() => {
    setSeen(readSeen());
    refresh();
    // Re-check after spending changes elsewhere (tab focus) and every few minutes
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [refresh]);

  const markAllRead = useCallback(() => {
    const keys = alerts.map((alert) => alert.key);
    setSeen(keys);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(keys));
    } catch {
      // ignore
    }
  }, [alerts]);

  const unread = alerts.filter((alert) => !seen.includes(alert.key));
  return { alerts, unread, markAllRead, refresh };
}
