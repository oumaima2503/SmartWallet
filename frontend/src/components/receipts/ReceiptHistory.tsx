/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock, Play, Trash2 } from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { ReceiptHistoryItem } from "@/types/receipts";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Illustration from "@/components/ui/Illustration";
import { useFeedback } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/States";
import { t } from "@/lib/i18n";

export function receiptImageUrl(id: number) {
  return `${API_URL}/api/receipts/${id}/image`;
}

type Props = {
  onContinue: (id: number) => void;
};

// Past scans: saved receipts (with their expense) and scans that were never saved
export default function ReceiptHistory({ onContinue }: Props) {
  const { money } = useCurrency();
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState<ReceiptHistoryItem[] | null>(null);
  const [viewing, setViewing] = useState<ReceiptHistoryItem | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<ReceiptHistoryItem[]>("/api/receipts"));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(item: ReceiptHistoryItem) {
    const ok = await confirm({
      title: "Delete this receipt?",
      message: item.transaction_id
        ? "The photo is deleted. The expense you saved from it stays in your transactions."
        : "The photo and what was read from it are deleted.",
      confirmLabel: t("Delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/receipts/${item.id}`, { method: "DELETE" });
      setViewing(null);
      toast.success(t("Receipt deleted."));
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  // Saved: the amount the user confirmed (MAD). Not saved: what was read, in the receipt's currency
  function amountLabel(item: ReceiptHistoryItem) {
    if (item.saved_amount !== null) return money(item.saved_amount);
    if (item.read_amount !== null) {
      const code = item.read_currency ?? "MAD";
      return code === "MAD" ? money(item.read_amount) : `${item.read_amount.toLocaleString("en-US")} ${code}`;
    }
    return "-";
  }

  return (
    <Card
      title={t("Scan history")}
      subtitle={items && items.length > 0 ? t(items.length > 1 ? "{count} receipts" : "{count} receipt", { count: items.length }) : undefined}
      className="mt-6"
    >
      {items === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Illustration name="receipt" className="h-24 w-32" />
          <p className="mt-2 text-sm text-muted">{t("Your scanned receipts will appear here.")}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => {
            const saved = item.transaction_id !== null;
            return (
              <li
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/5"
              >
                <button onClick={() => setViewing(item)} aria-label={t("View the receipt photo")} className="relative block h-32 w-full overflow-hidden bg-slate-100">
                  <img
                    src={receiptImageUrl(item.id)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
                  <span
                    className={`absolute start-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                      saved ? "bg-brand text-white" : "bg-amber-400 text-amber-950"
                    }`}
                  >
                    {saved ? <CircleCheck size={10} /> : <Clock size={10} />}
                    {saved ? t("Saved") : t("Not saved")}
                  </span>
                  <span className="absolute bottom-1.5 end-2 text-sm font-bold text-white drop-shadow">{amountLabel(item)}</span>
                </button>

                <div className="flex flex-1 flex-col p-2.5">
                  <p className="truncate text-sm font-semibold text-ink">{item.merchant || "Unknown store"}</p>
                  <p className="truncate text-[11px] text-muted">
                    {formatDate(item.created_at.slice(0, 10))}
                    {item.category && ` · ${t(item.category)}`}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {!saved ? (
                      <button
                        onClick={() => onContinue(item.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-soft py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand hover:text-white"
                      >
                        <Play size={12} />
                        {t("Continue")}
                      </button>
                    ) : (
                      <Link
                        href="/transactions"
                        className="flex flex-1 items-center justify-center rounded-lg bg-background py-1.5 text-xs font-medium text-ink/70 transition hover:text-ink"
                      >
                        {t("See expense")}
                      </Link>
                    )}
                    <button
                      onClick={() => remove(item)}
                      aria-label={t("Delete receipt")}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!viewing}
        title={viewing?.merchant || "Receipt"}
        description={viewing ? `${t("Scanned {date}", { date: formatDate(viewing.created_at.slice(0, 10)) })} · ${amountLabel(viewing)}` : undefined}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <>
            <div className="overflow-hidden rounded-xl bg-slate-900">
              <img src={receiptImageUrl(viewing.id)} alt="Receipt" className="mx-auto max-h-[60vh] w-auto object-contain" />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {viewing.transaction_id ? (
                <Link href="/transactions" className="rounded-xl px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft">
                  {t("See in transactions")}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    onContinue(viewing.id);
                    setViewing(null);
                  }}
                  className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  {t("Continue and save")}
                </button>
              )}
              <button onClick={() => remove(viewing)} className="rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                {t("Delete")}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
}
