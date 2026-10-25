"use client";

import { FormEvent, useRef, useState } from "react";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, User } from "@/lib/auth";
import { CURRENCIES, Currency, useCurrency } from "@/lib/currency";
import { photoToAvatar } from "@/lib/image";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { useFeedback } from "@/components/ui/Feedback";
import { t } from "@/lib/i18n";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const changed = !!user && (name.trim() !== user.name || email.trim().toLowerCase() !== user.email);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = t("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = t("Enter a valid email.");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const data = await api<{ user: User }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      setUser(data.user);
      toast.success(t("Your profile is updated."));
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function savePhoto(avatar: string | null) {
    setPhotoBusy(true);
    try {
      const data = await api<{ user: User }>("/api/users/me", { method: "PATCH", body: JSON.stringify({ avatar }) });
      setUser(data.user);
      toast.success(avatar ? t("Photo updated.") : t("Photo removed."));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return toast.error(t("Please choose a JPG, PNG or WEBP photo."));
    try {
      await savePhoto(await photoToAvatar(file));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function chooseCurrency(next: Currency) {
    try {
      await setCurrency(next);
      toast.success(t("Amounts are now shown in {currency}.", { currency: CURRENCIES[next].symbol }));
    } catch {
      toast.error(t("Could not save your currency."));
    }
  }

  if (!user) return null;

  return (
    <main className="page">
      <PageHeader title={t("My profile")} subtitle={t("Your personal information and preferences.")} />

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Photo */}
        <Card className="items-center text-center lg:row-span-2">
          <div className="relative mt-2">
            <Avatar name={user.name} src={user.avatar} size={112} className="ring-4 ring-brand-soft" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label={t("Change photo")}
              className="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white shadow-md ring-4 ring-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              <Camera size={16} />
            </button>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">{user.name}</h2>
          <p className="text-sm text-muted">{user.email}</p>

          <div className="mt-5 flex w-full flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={photoBusy}>
              <Camera size={15} />
              {user.avatar ? t("Change photo") : t("Add a photo")}
            </Button>
            {user.avatar && (
              <Button variant="ghost" size="sm" onClick={() => savePhoto(null)} disabled={photoBusy} className="hover:!text-red-600">
                <Trash2 size={15} />
                {t("Remove photo")}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">{t("JPG, PNG or WEBP. It is cropped to a square.")}</p>
          <input
            ref={fileRef}
            type="file"
            accept={PHOTO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </Card>

        {/* Personal information */}
        <Card title={t("Personal information")} subtitle={t("Shown in the app and used to log in.")} className="lg:col-span-2">
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" error={errors.name} />
              <Field
                label={t("Email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                error={errors.email}
                hint={t("You will use this email to log in.")}
              />
            </div>
            {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
            <div className="flex justify-end gap-2">
              {changed && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName(user.name);
                    setEmail(user.email);
                    setErrors({});
                  }}
                >
                  {t("Cancel")}
                </Button>
              )}
              <Button type="submit" loading={saving} disabled={!changed}>
                {t("Save changes")}
              </Button>
            </div>
          </form>
        </Card>

        {/* Preferences */}
        <Card title={t("Preferences")} className="lg:col-span-2">
          <p className="text-sm font-medium text-ink">{t("Display currency")}</p>
          <p className="mt-0.5 text-xs text-muted">{t("Amounts are converted at today's rate. Your data stays stored in MAD.")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(Object.keys(CURRENCIES) as Currency[]).map((code) => (
              <button
                key={code}
                onClick={() => chooseCurrency(code)}
                aria-pressed={currency === code}
                className={`rounded-xl border p-3 text-start transition ${
                  currency === code ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40"
                }`}
              >
                <p className="text-lg font-bold text-ink">{CURRENCIES[code].symbol}</p>
                <p className="text-xs text-muted">{CURRENCIES[code].name}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="text-sm font-medium text-ink">{t("Log out")}</p>
              <p className="text-xs text-muted">{t("You will need your email and password to come back.")}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={logout} className="hover:!border-red-200 hover:!text-red-600">
              <LogOut size={15} />
              {t("Log out")}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
