"use client";

import { FormEvent, useState } from "react";
import { ArrowRightLeft, Check, ChevronDown, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import { todayString } from "@/lib/format";
import { Currency, useCurrency } from "@/lib/currency";
import { Category, ReceiptExtraction } from "@/types/receipts";
import { t } from "@/lib/i18n";

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
  if (extraction.missing_fields.includes(field)) return t("Not found on the receipt. Please fill it in.");
  if (extraction.confidence[field] === "low") return t("Hard to read. Please check this value.");
  return undefined;
}

export default function ReviewForm({ extraction, categories, onSubmit, onCancel }: Props) {
  const { currency, rates, money } = useCurrency();

  // The total is shown EXACTLY as printed on the receipt, in the receipt's currency.
  // It is converted to MAD (the storage currency) only when saving; the conversion is shown live.
  const receiptCurrency = (extraction?.currency ?? "MAD").toUpperCase();
  const receiptTotal = extraction?.total_amount ?? null;

  // "1 MAD = rate units" for any currency we know
  const rateOf = (code: string) => (code === "MAD" ? 1 : rates?.all?.[code] ?? rates?.rates[code as Currency]);
  const knownReceiptCurrency = !!rateOf(receiptCurrency);
  // Currencies the user can pick for the total: the receipt's one first, then the usual ones
  const currencyOptions = [...new Set([receiptCurrency, "MAD", "EUR", "USD"])];

  const [merchant, setMerchant] = useState(extraction?.merchant ?? "");
  const [date, setDate] = useState(extraction?.date ?? todayString());
  const [amount, setAmount] = useState(receiptTotal !== null ? String(receiptTotal) : "");
  const [entryCurrency, setEntryCurrency] = useState(receiptCurrency);
  const [categoryId, setCategoryId] = useState(extraction?.suggested_category_id ? String(extraction.suggested_category_id) : "");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const suggestedId = extraction?.suggested_category_id ?? null;
  const usingSuggestion = suggestedId !== null && Number(categoryId) === suggestedId;

  const value = Number(amount);
  const entryRate = rateOf(entryCurrency);
  const amountMad = value > 0 && entryRate ? toBaseFrom(value, entryRate) : null;
  const asPrinted = receiptTotal !== null && value === receiptTotal && entryCurrency === receiptCurrency;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const newErrors: Errors = {};
    if (!amount || !(value > 0)) newErrors.amount = t("Enter the total amount paid.");
    else if (amountMad === null) newErrors.amount = t("No exchange rate for {currency}. Choose another currency.", { currency: entryCurrency });
    if (!date) newErrors.date = t("Enter the purchase date.");
    else if (date > todayString()) newErrors.date = t("The date can't be in the future.");
    if (!categoryId) newErrors.category = t("Choose a category.");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({ merchant: merchant.trim(), date, amount: amountMad!, category_id: Number(categoryId), description: description.trim() });
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  }

  const totalWarning = checkMessage(extraction, "total_amount");

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label={t("Store / merchant")}
        optional
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        maxLength={150}
        placeholder={t("e.g. Marjane")}
        warning={checkMessage(extraction, "merchant")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Total + its currency, exactly as on the receipt */}
        <div>
          <label htmlFor="receipt-total" className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
            Total paid
            {asPrinted && (
              <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                <Check size={11} /> {t("As printed")}
              </span>
            )}
          </label>
          <div
            className={`flex h-11 overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 ${
              errors.amount
                ? "border-red-400 focus-within:ring-red-100"
                : totalWarning
                  ? "border-amber-400 focus-within:ring-amber-100"
                  : "border-line focus-within:border-brand focus-within:ring-brand/15"
            }`}
          >
            <input
              id="receipt-total"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              className="min-w-0 flex-1 px-3 text-sm font-semibold text-ink outline-none"
            />
            <select
              value={entryCurrency}
              onChange={(e) => setEntryCurrency(e.target.value)}
              aria-label={t("Currency of the total")}
              className="border-s border-line bg-background/60 px-2 text-xs font-semibold text-ink outline-none"
            >
              {currencyOptions.map((code) => (
                <option key={code} value={code} disabled={!rateOf(code) && code !== entryCurrency}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          {errors.amount ? (
            <p className="mt-1.5 text-xs text-red-600">{errors.amount}</p>
          ) : totalWarning ? (
            <p className="mt-1.5 text-xs text-amber-700">{totalWarning}</p>
          ) : null}
        </div>
        <Field
          label={t("Purchase date")}
          type="date"
          max={todayString()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          warning={checkMessage(extraction, "date")}
        />
      </div>

      {/* Live conversion: what will actually be saved */}
      {amountMad !== null && entryCurrency !== "MAD" && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
          <ArrowRightLeft size={14} className="shrink-0" />
          <span>
            {value.toLocaleString("en-US")} {entryCurrency} ={" "}
            <span className="font-bold">{amountMad.toLocaleString("en-US")} MAD</span> will be saved
            {currency !== "MAD" && currency !== entryCurrency && <> (≈ {money(amountMad)})</>}, at today&apos;s rate.
          </span>
        </p>
      )}
      {rates && !knownReceiptCurrency && extraction?.currency && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          We have no exchange rate for {receiptCurrency}. Choose the currency you paid in, or enter the total in MAD.
        </p>
      )}

      <div>
        <label htmlFor="category" className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
          Category
          {usingSuggestion && (
            <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
              <Sparkles size={12} />
              {t("AI suggestion")}
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
          <option value="">{t("Choose a category")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {t(category.name)}
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
        label={t("Description")}
        optional
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={255}
        placeholder={t("e.g. Weekly groceries")}
      />

      {extraction && (extraction.items.length > 0 || extraction.raw_text) && (
        <div className="rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink"
          >
            {t("What we read on the receipt")}
            <ChevronDown size={16} className={`text-muted transition ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div className="border-t border-line px-4 py-3 text-sm">
              {extraction.items.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {extraction.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3 text-ink">
                      <span className="truncate">{item.name}</span>
                      <span className="shrink-0 text-muted">{item.price !== null ? `${item.price.toLocaleString("en-US")} ${receiptCurrency}` : "-"}</span>
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
          {t("Discard")}
        </Button>
        <Button type="submit" loading={saving}>
          {t("Add expense")}
        </Button>
      </div>
    </form>
  );
}
