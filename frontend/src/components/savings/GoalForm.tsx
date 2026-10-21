"use client";

import { FormEvent, useState } from "react";

export type GoalFormValues = {
  name: string;
  target_amount: number;
  target_date: string | null;
};

type Props = {
  initial?: GoalFormValues;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  onCancel?: () => void;
};

export default function GoalForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.target_amount) : "");
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const amount = Number(targetAmount);
    if (!name.trim()) return setError("Please enter a name.");
    if (!amount || amount <= 0) return setError("The target amount must be greater than 0.");

    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), target_amount: amount, target_date: targetDate || null });
      if (!initial) {
        setName("");
        setTargetAmount("");
        setTargetDate("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New laptop"
            maxLength={100}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Target amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="8000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Target date (optional)</span>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
