"use client";

import Link from "next/link";
import {
  Briefcase,
  Bus,
  CircleDollarSign,
  Clapperboard,
  Gift,
  HeartPulse,
  House,
  Laptop,
  LucideIcon,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { RecentTransaction } from "@/types/dashboard";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Groceries: ShoppingCart,
  Transportation: Bus,
  Housing: House,
  Entertainment: Clapperboard,
  Shopping: ShoppingBag,
  Healthcare: HeartPulse,
  Bills: Receipt,
  Restaurants: UtensilsCrossed,
  Salary: Briefcase,
  Freelance: Laptop,
  Gifts: Gift,
};

export default function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  const { money } = useCurrency();

  return (
    <Card
      title="Recent transactions"
      className="h-full"
      action={
        <Link href="/transactions" className="font-medium text-brand hover:underline">
          View all
        </Link>
      }
    >
      {transactions.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-muted">No transactions this month.</p>
      ) : (
        // About 4 rows visible, the rest scrolls
        <ul className="thin-scroll -mx-2 max-h-[14.5rem] overflow-y-auto px-2" tabIndex={0} aria-label="Recent transactions">
          {transactions.map((transaction) => {
            const Icon = CATEGORY_ICONS[transaction.category] ?? CircleDollarSign;
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
                    {transaction.merchant || transaction.description || transaction.category}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {transaction.category} · {formatDate(transaction.date)}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${isIncome ? "text-brand" : "text-ink"}`}>
                  {isIncome ? "+" : "-"}
                  {money(transaction.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
