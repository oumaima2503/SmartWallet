"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { todayString } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { t } from "@/lib/i18n";

type Props = {
  remaining: number;
  onSubmit: (values: { amount: number; date: string; note: string }) => Promise<void>;
  onCancel: () => void;
};

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export default function ContributionForm({ remaining, onSubmit, onCancel }: Props) {
  const { convert, toBase, money, symbol } = useCurrency();
  const [amount, setAmount] = useState("");
  // Set when "Remaining" is clicked, so the goal is reached exactly (no rounding between currencies)
  const [exactMad, setExactMad] = useState<number | null>(null);
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount);
  const remainingShown = Math.round(convert(remaining) * 100) / 100;
  const quickAmounts = QUICK_AMOUNTS.filter((quick) => quick < remainingShown);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!amount || !(value > 0)) return setError(t("Enter an amount greater than 0."));
    setError("");

    setSaving(true);
    try {
      const amountMad = exactMad !== null && Number(amount) === remainingShown ? exactMad : toBase(value);
      await onSubmit({ amount: amountMad, date, note: note.trim() });
    } catch (err) {
      setFormError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <Field
          label={t("Amount")}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setExactMad(null);
          }}
          placeholder="0"
          suffix={symbol}
          error={error}
          hint={
            value > remainingShown && remaining > 0
              ? t("That's more than the {amount} left. The goal will be reached.", { amount: money(remaining) })
              : undefined
          }
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {quickAmounts.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => {
                setAmount(String(quick));
                setExactMad(null);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition hover:border-brand hover:bg-brand-soft"
            >
              {quick.toLocaleString("en-US")} {symbol}
            </button>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => {
                setAmount(String(remainingShown));
                setExactMad(remaining);
              }}
              className="rounded-full border border-brand bg-brand-soft px-3 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand hover:text-white"
            >
              Remaining {money(remaining)}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Date")} type="date" value={date} max={todayString()} onChange={(e) => setDate(e.target.value)} />
        <Field
          label={t("Note")}
          optional
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={255}
          placeholder={t("e.g. Part of my salary")}
        />
      </div>

      <p className="rounded-xl bg-background p-3 text-xs text-muted">
        {t("Money you put aside is tracked here only. It is not counted as an expense.")}
      </p>

      {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={saving}>
          {t("Add money")}
        </Button>
      </div>
    </form>
  );
}
