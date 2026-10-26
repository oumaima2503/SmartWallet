"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, ScanLine, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { Category, SavedExpense, ScanResponse } from "@/types/receipts";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useFeedback } from "@/components/ui/Feedback";
import UploadZone from "@/components/receipts/UploadZone";
import ReceiptHistory, { receiptImageUrl } from "@/components/receipts/ReceiptHistory";
import ReviewForm, { ReviewValues } from "@/components/receipts/ReviewForm";
import { t } from "@/lib/i18n";

type Step = "upload" | "scanning" | "review" | "saved";

const STEPS = ["Upload", "Review", "Saved"];

function Stepper({ step }: { step: Step }) {
  const index = step === "upload" || step === "scanning" ? 0 : step === "review" ? 1 : 2;
  return (
    <ol className="mt-6 flex items-center gap-2 text-sm" aria-label={t("Progress")}>
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === index ? "step" : undefined}>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < index ? "bg-brand text-white" : i === index ? "bg-ink text-white" : "bg-slate-200 text-muted"
            }`}
          >
            {i < index ? <CircleCheck size={14} /> : i + 1}
          </span>
          <span className={i === index ? "font-semibold text-ink" : "text-muted"}>{t(label)}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

function ScanStatus({ scan }: { scan: ScanResponse }) {
  if (scan.status === "extracted") {
    const missing = scan.extraction?.missing_fields.length ?? 0;
    return (
      <div className="flex gap-3 rounded-2xl bg-brand-soft p-4 text-sm text-brand-dark">
        <CircleCheck size={18} className="mt-0.5 shrink-0" />
        <p>
          {missing === 0
            ? "We read your receipt. Check the details, then add the expense."
            : t("We read part of your receipt. Fill in the highlighted fields.")}
        </p>
      </div>
    );
  }
  if (scan.status === "not_a_receipt") {
    return (
      <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" />
        <p>{t("This photo doesn't look like a receipt. You can try another photo or fill in the details yourself.")}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
      <CircleAlert size={18} className="mt-0.5 shrink-0" />
      <div>
        <p>{t("We couldn't read this receipt automatically. Please fill in the details below.")}</p>
        {scan.error && <p className="mt-1 text-xs opacity-75">Reason: {scan.error}</p>}
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { money, currency, rates } = useCurrency();
  const { toast } = useFeedback();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  // Name shown under the photo (file name, or the scan date when reopened from the history)
  const [photoLabel, setPhotoLabel] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saved, setSaved] = useState<(SavedExpense & { category: string }) | null>(null);

  useEffect(() => {
    api<Category[]>("/api/categories?type=expense")
      .then(setCategories)
      .catch(() => toast.error(t("Could not load your categories.")));
  }, [toast]);

  // Free the preview URL when it changes
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(selected: File) {
    setFile(selected);
    setPhotoLabel(selected.name);
    setPreview(URL.createObjectURL(selected));
    setStep("scanning");

    const form = new FormData();
    form.append("file", selected);
    try {
      setScan(await api<ScanResponse>("/api/receipts/scan", { method: "POST", body: form }));
      setStep("review");
    } catch (err) {
      toast.error((err as Error).message);
      reset();
    }
  }

  async function continueReceipt(id: number) {
    try {
      const data = await api<ScanResponse & { transaction_id: number | null }>(`/api/receipts/${id}`);
      if (data.transaction_id) return toast.error(t("This receipt is already saved as an expense."));
      setFile(null);
      setPhotoLabel("Receipt from your history");
      setPreview(receiptImageUrl(id));
      setScan(data);
      setStep("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleConfirm(values: ReviewValues) {
    const expense = await api<SavedExpense>(`/api/receipts/${scan!.receipt_id}/confirm`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    const category = categories.find((c) => c.id === values.category_id)?.name ?? "";
    setSaved({ ...expense, category });
    setStep("saved");
  }

  function reset() {
    setFile(null);
    setPhotoLabel("");
    setPreview(null);
    setScan(null);
    setSaved(null);
    setStep("upload");
  }

  return (
    <main className="page">
      <PageHeader title={t("Scan a receipt")} subtitle={t("Turn a photo of your receipt into an expense in seconds.")} />
      <Stepper step={step} />

      {step === "upload" && (
        <div className="mt-6">
          <div data-tour="scan-upload">
            <UploadZone onFile={handleFile} />
          </div>
          <div data-tour="scan-history">
            <ReceiptHistory onContinue={continueReceipt} />
          </div>
        </div>
      )}

      {(step === "scanning" || step === "review") && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card className="!p-3">
              <div className="relative overflow-hidden rounded-xl bg-slate-900">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Your receipt" className="mx-auto max-h-[60vh] w-auto object-contain" />
                )}
                {step === "scanning" && (
                  <>
                    <div className="absolute inset-0 bg-ink/30" />
                    <div className="scan-line absolute inset-x-0 h-1 bg-brand shadow-[0_0_20px_4px] shadow-brand/60" />
                  </>
                )}
              </div>
              <p className="mt-2 truncate px-1 text-xs text-muted">{photoLabel || file?.name}</p>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {step === "scanning" ? (
              <Card>
                <div className="flex flex-col items-center py-12 text-center" role="status">
                  <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <ScanLine size={26} />
                  </span>
                  <h2 className="mt-4 font-semibold text-ink">{t("Reading your receipt...")}</h2>
                  <p className="mt-1 text-sm text-muted">{t("Finding the store, date and total. This takes a few seconds.")}</p>
                </div>
              </Card>
            ) : (
              scan && (
                <div className="space-y-4">
                  <ScanStatus scan={scan} />
                  <Card title={t("Check the details")}>
                    <ReviewForm
                      key={`${scan.receipt_id}-${currency}-${rates ? "rates" : "no-rates"}`}
                      extraction={scan.extraction}
                      categories={categories}
                      onSubmit={handleConfirm}
                      onCancel={reset}
                    />
                  </Card>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {step === "saved" && saved && (
        <Card className="mx-auto mt-6 max-w-lg">
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
              <CircleCheck size={32} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">{t("Expense added")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Your dashboard and budgets are up to date.")}</p>

            <dl className="mt-6 w-full divide-y divide-line rounded-2xl border border-line text-start text-sm">
              {[
                ["Amount", money(saved.amount)],
                ["Store", saved.merchant || "-"],
                ["Category", saved.category],
                ["Date", formatDate(saved.date)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 px-4 py-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={reset}>
                {t("Scan another")}
              </Button>
              <Link
                href="/"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark"
              >
                {t("Go to dashboard")}
              </Link>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}
