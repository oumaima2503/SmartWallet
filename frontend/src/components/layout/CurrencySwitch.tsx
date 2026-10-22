"use client";

import { CURRENCIES, Currency, useCurrency } from "@/lib/currency";
import { useFeedback } from "@/components/ui/Feedback";

// Segmented control: MAD | € | $
export default function CurrencySwitch({ className = "" }: { className?: string }) {
  const { currency, setCurrency, rates } = useCurrency();
  const { toast } = useFeedback();

  async function choose(next: Currency) {
    if (next === currency) return;
    try {
      await setCurrency(next);
    } catch {
      toast.error("Could not save your currency. Please try again.");
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Display currency"
      title={rates?.source === "fallback" ? "Approximate exchange rates (offline)" : undefined}
      className={`inline-flex rounded-xl bg-background p-1 ${className}`}
    >
      {(Object.keys(CURRENCIES) as Currency[]).map((code) => {
        const active = code === currency;
        return (
          <button
            key={code}
            role="radio"
            aria-checked={active}
            aria-label={CURRENCIES[code].name}
            onClick={() => choose(code)}
            className={`h-8 min-w-11 rounded-lg px-2.5 text-xs font-semibold transition ${
              active ? "bg-white text-brand-dark shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {CURRENCIES[code].symbol}
          </button>
        );
      })}
    </div>
  );
}
