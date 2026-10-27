"use client";

import { FormEvent, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { categoryIcon } from "@/lib/categoryIcons";
import { Category } from "@/types/receipts";
import { TransactionType } from "@/types/transactions";
import Button from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import { t } from "@/lib/i18n";

type Props = {
  categories: Category[];
  onChange: () => Promise<void>;
  // Show only one type, without the tabs (e.g. budgets only use expense categories)
  only?: TransactionType;
};

// Default categories (read only) + the user's own categories (add, rename, delete)
export default function CategoriesManager({ categories, onChange, only }: Props) {
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState<TransactionType>(only ?? "expense");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = categories.filter((category) => category.type === tab);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      await onChange();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.type === tab && c.name.toLowerCase() === name.toLowerCase())) {
      return toast.error(t('"{name}" already exists.', { name }));
    }
    const ok = await run(
      () => api("/api/categories", { method: "POST", body: JSON.stringify({ name, type: tab }) }),
      t("Category \"{name}\" added.", { name })
    );
    if (ok) setNewName("");
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.name.trim()) return;
    const ok = await run(
      () => api(`/api/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify({ name: editing.name.trim() }) }),
      t("Category renamed.")
    );
    if (ok) setEditing(null);
  }

  async function remove(category: Category) {
    const yes = await confirm({
      title: t("Delete \"{name}\"?", { name: category.name }),
      message: t("You can only delete a category that is not used by any transaction or budget."),
      confirmLabel: t("Delete"),
      danger: true,
    });
    if (yes) await run(() => api(`/api/categories/${category.id}`, { method: "DELETE" }), t("Category deleted."));
  }

  return (
    <div>
      {!only && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-background p-1">
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            aria-pressed={tab === type}
            className={`h-9 rounded-lg text-sm font-semibold transition ${
              tab === type ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t(type === "income" ? "Income categories" : "Expense categories")}
          </button>
        ))}
        </div>
      )}

      <ul className={`thin-scroll max-h-72 space-y-1 overflow-y-auto ${only ? "" : "mt-4"}`}>
        {list.map((category) => {
          const Icon = categoryIcon(category.name);
          const isEditing = editing?.id === category.id;
          return (
            <li key={category.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-background">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink/70">
                <Icon size={15} />
              </span>
              {isEditing ? (
                <form onSubmit={rename} className="flex flex-1 items-center gap-1">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    maxLength={100}
                    autoFocus
                    aria-label={t("Category name")}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-brand px-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <button type="submit" disabled={busy} aria-label={t("Save")} className="rounded-lg p-1.5 text-brand hover:bg-brand-soft">
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} aria-label={t("Cancel")} className="rounded-lg p-1.5 text-muted hover:bg-slate-100">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{t(category.name)}</span>
                  {category.is_custom ? (
                    <span className="flex">
                      <button
                        onClick={() => setEditing({ id: category.id, name: category.name })}
                        aria-label={`${t("Rename")} ${category.name}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(category)}
                        aria-label={`${t("Delete")} ${category.name}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-muted">{t("Default")}</span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="mt-4 flex gap-2 border-t border-line pt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          placeholder={t(tab === "income" ? "New income category" : "New expense category")}
          aria-label={t("New category name")}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <Button type="submit" size="sm" loading={busy} disabled={!newName.trim()}>
          <Plus size={15} />
          {t("Add")}
        </Button>
      </form>
    </div>
  );
}
