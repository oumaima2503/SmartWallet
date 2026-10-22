"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { todayString } from "@/lib/format";
import { useCurrency } from "@/lib/currency";

export type GoalFormValues = {
  name: string;
  target_amount: number;
  target_date: string | null;
};

type Props = {
  initial?: GoalFormValues;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  onCancel: () => void;
};

type Errors = Partial<Record<"name" | "target_amount" | "form", string>>;

export default function GoalForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const { convert, toBase, symbol } = useCurrency();
  // The target is shown and typed in the chosen currency
  const initialShown = initial ? String(Math.round(convert(initial.target_amount) * 100) / 100) : "";
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(initialShown);
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const amount = Number(targetAmount);
    const newErrors: Errors = {};
    if (!name.trim()) newErrors.name = "Give your goal a name.";
    if (!targetAmount || !(amount > 0)) newErrors.target_amount = "Enter an amount greater than 0.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      // Unchanged value: keep the exact stored amount (avoids rounding drift between currencies)
      const targetMad = initial && targetAmount === initialShown ? initial.target_amount : toBase(amount);
      await onSubmit({ name: name.trim(), target_amount: targetMad, target_date: targetDate || null });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label="Goal name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. New laptop, Vacation, Emergency fund"
        maxLength={100}
        error={errors.name}
      />
      <Field
        label="Target amount"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
        placeholder="8000"
        suffix={symbol}
        error={errors.target_amount}
      />
      <Field
        label="Target date"
        optional
        type="date"
        min={initial ? undefined : todayString()}
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        hint="We'll tell you how much to save each month to get there."
      />

      {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
