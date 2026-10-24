"use client";

import { FormEvent, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useCurrency } from "@/lib/currency";
import { todayString } from "@/lib/format";
import { Category } from "@/types/receipts";
import { Transaction, TransactionInput, TransactionType } from "@/types/transactions";

type Props = {
  categories: Category[];
  initial?: Transaction;
  submitLabel: string;
  onSubmit: (values: TransactionInput) => Promise<void>;
  onCancel: () => void;
};

type Errors = Partial<Record<"amount" | "date" | "category" | "form", string>>;

export default function TransactionForm({ categories, initial, submitLabel, onSubmit, onCancel }: Props) {
  const { convert, toBase, symbol } = useCurrency();
  // Amounts are typed in the chosen currency and saved in MAD
  const initialShown = initial ? String(Math.round(convert(Number(initial.amount)) * 100) / 100) : "";

  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initialShown);
  const [date, setDate] = useState(initial?.date ?? todayString());
  const [categoryId, setCategoryId] = useState(initial ? String(initial.category_id) : "");
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const options = categories.filter((category) => category.type === type);

  function changeType(next: TransactionType) {
    setType(next);
    // A category belongs to one type: reset it when switching
    if (!categories.some((c) => String(c.id) === categoryId && c.type === next)) setCategoryId("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    const newErrors: Errors = {};
    if (!amount || !(value > 0)) newErrors.amount = "Enter an amount greater than 0.";
    if (!date) newErrors.date = "Choose a date.";
    if (!categoryId) newErrors.category = "Choose a category.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Unchanged amount: keep the exact stored value (no rounding between currencies)
    const amountMad = initial && amount === initialShown ? Number(initial.amount) : toBase(value);

    setSaving(true);
    try {
      await onSubmit({
        type,
        category_id: Number(categoryId),
        amount: amountMad.toFixed(2),
        date,
        merchant: merchant.trim() || null,
        description: description.trim() || null,
      });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Expense / income switch */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1" role="radiogroup" aria-label="Type">
        {(
          [
            ["expense", "Expense", ArrowUpRight, "text-rose-600"],
            ["income", "Income", ArrowDownLeft, "text-brand-dark"],
          ] as const
        ).map(([value, label, Icon, color]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => changeType(value)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ${
              type === value ? `bg-white shadow-sm ${color}` : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          suffix={symbol}
          error={errors.amount}
          autoFocus={!initial}
        />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      </div>

      <Select
        label="Category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        error={errors.category}
      >
        <option value="">Choose a category</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {category.is_custom ? " (custom)" : ""}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={type === "income" ? "From" : "Store / merchant"}
          optional
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          maxLength={150}
          placeholder={type === "income" ? "e.g. Employer" : "e.g. Marjane"}
        />
        <Field
          label="Description"
          optional
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
          placeholder="e.g. Weekly groceries"
        />
      </div>

      {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
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
