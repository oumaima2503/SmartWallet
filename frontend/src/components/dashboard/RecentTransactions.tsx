"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { categoryIcon } from "@/lib/categoryIcons";
import { formatDate } from "@/lib/format";
import { RecentTransaction } from "@/types/dashboard";
import Amount from "@/components/ui/Amount";
import { t } from "@/lib/i18n";
import Pager, { usePaged } from "@/components/ui/Pager";

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  const paged = usePaged(transactions, 4);

  return (
    <Card
      title={t("Recent transactions")}
      className="h-full"
      action={
        <Link href="/transactions" className="font-medium text-brand hover:underline">
          {t("View all")}
        </Link>
      }
    >
      {transactions.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-muted">{t("No transactions this month.")}</p>
      ) : (
        <>
        {/* 4 per page; the list keeps its height so the pager stays in place */}
        <ul key={paged.page} className="rise -mx-1.5 min-h-[13.5rem] flex-1" aria-label={t("Recent transactions")}>
          {paged.visible.map((transaction) => {
            const Icon = categoryIcon(transaction.category);
            const isIncome = transaction.type === "income";
            return (
              <li key={transaction.id} className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition hover:bg-background">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isIncome ? "bg-brand-soft text-brand" : "bg-slate-100 text-ink/70"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {transaction.merchant || transaction.description || t(transaction.category)}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {t(transaction.category)} · {formatDate(transaction.date)}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${isIncome ? "text-brand" : "text-ink"}`}>
                  <Amount value={transaction.amount} size="list" sign={isIncome ? "+" : "-"} />
                </span>
              </li>
            );
          })}
        </ul>
        <Pager {...paged} onChange={paged.setPage} />
        </>
      )}
    </Card>
  );
}
