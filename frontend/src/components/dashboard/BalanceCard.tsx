"use client";

import { Wallet } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import Sparkline from "@/components/ui/Sparkline";

type Props = {
  income: number;
  expenses: number;
  balance: number;
  trend: number[];
};

// Highlighted card: what is left this month and how much of the income was spent
export default function BalanceCard({ income, expenses, balance, trend }: Props) {
  const { money } = useCurrency();
  const spentPercent = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : null;

  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-[#0b7d45] to-brand p-4 text-white shadow-md shadow-brand/20">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <Wallet size={16} />
            </span>
            <span className="text-xs font-medium text-white/80">Balance this month</span>
          </span>
          <Sparkline values={trend} color="#ffffff" className="h-7 w-16 opacity-80" />
        </div>

        <p className="mt-3 truncate text-2xl font-bold tracking-tight">{money(balance)}</p>

        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${spentPercent ?? 0}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-white/80">
            {spentPercent === null ? "No income recorded this month" : `${spentPercent}% of your income spent`}
          </p>
        </div>
      </div>
    </div>
  );
}
