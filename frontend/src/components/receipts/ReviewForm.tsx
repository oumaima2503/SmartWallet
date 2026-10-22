"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { todayString } from "@/lib/format";
import { CURRENCIES, Currency, useCurrency } from "@/lib/currency";
import { Category, ReceiptExtraction } from "@/types/receipts";

export type ReviewValues = {
  merchant: string;
  date: string;
  amount: number;
  category_id: number;
  description: string;
};

type Props = {
  extraction: ReceiptExtraction | null;
  categories: Category[];
  onSubmit: (values: ReviewValues) => Promise<void>;
  onCancel: () => void;
};

type Errors = Partial<Record<"date" | "amount" | "category" | "form", string>>;

// Amount in a currency -> MAD, with the rate "1 MAD = rate units"
function toBaseFrom(amount: number, rate: number) {
  return rate > 0 ? Math.round((amount / rate) * 100) / 100 : amount;
}

// Message for a value read by the AI: missing, uncertain, or fine
function checkMessage(extraction: ReceiptExtraction | null, field: "merchant" | "date" | "total_amount") {
  if (!extraction) return undefined;
  if (extraction.missing_fields.includes(field)) return "Not found on the receipt. Please fill it in.";
  if (extraction.confidence[field] === "low") return "Hard to read. Please check this value.";
  return undefined;
}

export default function ReviewForm({ extraction, categories, onSubmit, onCancel }: Props) {
  const { currency, rates, convert, toBase, symbol } = useCurrency();

  // The receipt total is in the receipt's currency (MAD when unknown). Convert it to MAD,
  // then show it in the chosen currency. Unsupported currencies are left for the user to convert.
  const receiptCurrency = extraction?.currency ?? "MAD";
  const supported = receiptCurrency in CURRENCIES && !!rates;
  const receiptTotal = extraction?.total_amount ?? null;
  const totalMad =
    receiptTotal === null ? null : supported ? toBaseFrom(receiptTotal, rates!.rates[receiptCurrency as Currency]) : receiptTotal;
  const initialShown = totalMad === null ? "" : String(Math.round(convert(totalMad) * 100) / 100);

  const [merchant, setMerchant] = useState(extraction?.merchant ?? "");
  const [date, setDate] = useState(extraction?.date ?? todayString());
  const [amount, setAmount] = useState(initialShown);
  const [categoryId, setCategoryId] = useState(extraction?.suggested_category_id ? String(extraction.suggested_category_id) : "");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const suggestedId = extraction?.suggested_category_id ?? null;
  const usingSuggestion = suggestedId !== null && Number(categoryId) === suggestedId;
  const converted = receiptCurrency !== currency && supported && receiptTotal !== null;
  const unsupportedCurrency = extraction?.currency && !(extraction.currency in CURRENCIES) ? extraction.currency : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    const newErrors: Errors = {};
    if (!amount || !(value > 0)) newErrors.amount = "Enter the total amount paid.";
    if (!date) newErrors.date = "Enter the purchase date.";
    else if (date > todayString()) newErrors.date = "The date can't be in the future.";
    if (!categoryId) newErrors.category = "Choose a category.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({ merchant: merchant.trim(), date, amount: totalMad !== null && amount === initialShown ? totalMad : toBase(value), category_id: Number(categoryId), description: description.trim() });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label="Store / merchant"
        optional
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        maxLength={150}
        placeholder="e.g. Marjane"
        warning={checkMessage(extraction, "merchant")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Total paid"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix={symbol}
          error={errors.amount}
          warning={checkMessage(extraction, "total_amount")}
        />
        <Field
          label="Purchase date"
          type="date"
          max={todayString()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          warning={checkMessage(extraction, "date")}
        />
      </div>

      {converted && (
        <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
          Converted from {receiptTotal!.toLocaleString("fr-FR")} {receiptCurrency} on the receipt, at today&apos;s rate.
        </p>
      )}
      {unsupportedCurrency && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          This receipt seems to be in {unsupportedCurrency}. Please convert the total to {symbol} before saving.
        </p>
      )}

      <div>
        <label htmlFor="category" className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
          Category
          {usingSuggestion && (
            <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
              <Sparkles size={12} />
              AI suggestion
            </span>
          )}
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-invalid={!!errors.category}
          className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-ink outline-none transition focus:ring-4 ${
            errors.category ? "border-red-400 focus:ring-red-100" : "border-line focus:border-brand focus:ring-brand/15"
          }`}
        >
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p className="mt-1.5 text-xs text-red-600">{errors.category}</p>
        ) : (
          usingSuggestion &&
          extraction?.category_reason && <p className="mt-1.5 text-xs text-muted">{extraction.category_reason}</p>
        )}
      </div>

      <Field
        label="Description"
        optional
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={255}
        placeholder="e.g. Weekly groceries"
      />

      {extraction && (extraction.items.length > 0 || extraction.raw_text) && (
        <div className="rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink"
          >
            What we read on the receipt
            <ChevronDown size={16} className={`text-muted transition ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div className="border-t border-line px-4 py-3 text-sm">
              {extraction.items.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {extraction.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3 text-ink">
                      <span className="truncate">{item.name}</span>
                      <span className="shrink-0 text-muted">{item.price !== null ? `${item.price.toLocaleString("fr-FR")} ${receiptCurrency}` : "-"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-xs text-muted">
                {extraction.raw_text}
              </pre>
            </div>
          )}
        </div>
      )}

      {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Discard
        </Button>
        <Button type="submit" loading={saving}>
          Add expense
        </Button>
      </div>
    </form>
  );
}
