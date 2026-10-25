"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useCurrency } from "@/lib/currency";
import { formatMonth } from "@/lib/format";
import { Category } from "@/types/receipts";
import { t } from "@/lib/i18n";

export type BudgetFormValues = { category_id: number | null; amount_limit: string };

type Props = {
  month: string;
  categories: Category[];
  // Categories that already have a budget this month (can't be chosen twice)
  takenCategoryIds: number[];
  hasOverall: boolean;
  initial?: { category_id: number | null; amount_limit: number };
  // Pre-filled values, e.g. from "Set budget" on an unbudgeted category
  preset?: { category_id: number | null; amount_limit: number };
  submitLabel: string;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  onCancel: () => void;
};

const OVERALL = "overall";

export default function BudgetForm({
  month,
  categories,
  takenCategoryIds,
  hasOverall,
  initial,
  preset,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { convert, toBase, symbol } = useCurrency();
  const start = initial ?? preset;
  const initialShown = start ? String(Math.round(convert(start.amount_limit) * 100) / 100) : "";

  const firstFree = !hasOverall ? OVERALL : String(categories.find((c) => !takenCategoryIds.includes(c.id))?.id ?? "");
  const [scope, setScope] = useState(start ? (start.category_id === null ? OVERALL : String(start.category_id)) : firstFree);
  const [amount, setAmount] = useState(initialShown);
  const [errors, setErrors] = useState<{ amount?: string; scope?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    const newErrors: typeof errors = {};
    if (!scope) newErrors.scope = t("Choose what this budget is for.");
    if (!amount || !(value > 0)) newErrors.amount = t("Enter a limit greater than 0.");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Unchanged value: keep the exact stored amount (no rounding between currencies)
    const limitMad = initial && amount === initialShown ? initial.amount_limit : toBase(value);

    setSaving(true);
    try {
      await onSubmit({ category_id: scope === OVERALL ? null : Number(scope), amount_limit: limitMad.toFixed(2) });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Select
        label={t("Budget for")}
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        error={errors.scope}
        hint={scope === OVERALL ? t("All your expenses of the month count toward this limit.") : t("Only expenses in this category count.")}
      >
        <option value="" disabled>
          {t("Choose...")}
        </option>
        <option value={OVERALL} disabled={hasOverall && initial?.category_id !== null}>
          Overall monthly budget{hasOverall && initial?.category_id !== null ? " (already set)" : ""}
        </option>
        <optgroup label={t("Category budget")}>
          {categories.map((category) => {
            const taken = takenCategoryIds.includes(category.id) && initial?.category_id !== category.id;
            return (
              <option key={category.id} value={category.id} disabled={taken}>
                {t(category.name)}
                {taken ? " (already set)" : ""}
              </option>
            );
          })}
        </optgroup>
      </Select>

      <Field
        label={t("Limit for {month}", { month: formatMonth(month) })}
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        suffix={symbol}
        error={errors.amount}
      />

      {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
