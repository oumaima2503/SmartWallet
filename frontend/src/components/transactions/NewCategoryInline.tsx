"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Category } from "@/types/receipts";
import { TransactionType } from "@/types/transactions";
import { t } from "@/lib/i18n";

type Props = {
  type: TransactionType;
  // Existing categories, to refuse duplicates before calling the API
  categories: Category[];
  onCreate: (name: string, type: TransactionType) => Promise<Category>;
  // The new category, so the form can select it
  onCreated: (category: Category) => void;
};

// "+ New category" link that opens a small inline form (used in the transaction and budget forms)
export default function NewCategoryInline({ type, categories, onCreate, onCreated }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setName(null);
    setError("");
  }

  async function create() {
    const value = (name ?? "").trim();
    if (!value) return;
    if (categories.some((c) => c.type === type && c.name.toLowerCase() === value.toLowerCase())) {
      return setError(t('"{name}" already exists.', { name: value }));
    }
    setCreating(true);
    setError("");
    try {
      onCreated(await onCreate(value, type));
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (name === null) {
    return (
      <button type="button" onClick={() => setName("")} className="-mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
        <Plus size={13} />
        {t(type === "income" ? "New income category" : "New expense category")}
      </button>
    );
  }

  return (
    <div className="-mt-1 rounded-xl border border-brand/30 bg-brand-soft/40 p-2.5">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the category instead of submitting the whole form
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
          maxLength={100}
          autoFocus
          placeholder={t(type === "income" ? "New income category" : "New expense category")}
          aria-label={t("New category name")}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <Button type="button" size="sm" onClick={create} loading={creating} disabled={!name.trim()} aria-label={t("Add")}>
          <Check size={15} />
        </Button>
        <button
          type="button"
          onClick={close}
          aria-label={t("Cancel")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-ink"
        >
          <X size={15} />
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
