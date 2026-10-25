"use client";

import { Wallet } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";
import Hero from "@/components/ui/Hero";
import Amount from "@/components/ui/Amount";
import { t } from "@/lib/i18n";

type Props = {
  income: number;
  expenses: number;
  balance: number;
  trend: number[];
};

// Highlighted card: what is left this month and how much of the income was spent
export default function BalanceCard({ income, expenses, balance, trend }: Props) {
  const spentPercent = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : null;

  return (
    <Hero className="h-full !p-4">

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <Wallet size={16} />
            </span>
            <span className="text-xs font-medium text-white/80">{t("Balance this month")}</span>
          </span>
          <Sparkline values={trend} color="#ffffff" className="h-7 w-16 opacity-80" />
        </div>

        <p className="mt-3 truncate">
          <Amount value={balance} size="hero" />
        </p>

        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="fill-in h-full rounded-full bg-white" style={{ width: `${spentPercent ?? 0}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-white/80">
            {spentPercent === null ? t("No income recorded this month") : t("{percent}% of your income spent", { percent: spentPercent })}
          </p>
        </div>
      </div>
    </Hero>
  );
}
