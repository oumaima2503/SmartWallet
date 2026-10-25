"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { Language, LANGUAGES, useT } from "@/lib/i18n";

// Small dropdown: EN / FR / ع
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("Language")}
        aria-expanded={open}
        title={t("Language")}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 text-xs font-semibold text-ink transition hover:bg-background"
      >
        <Languages size={16} className="text-muted" />
        {LANGUAGES[language].short}
      </button>
      {open && (
        <ul role="listbox" aria-label={t("Language")} className="absolute end-0 z-40 mt-2 w-40 rounded-2xl border border-line bg-white p-1.5 shadow-xl shadow-slate-900/10">
          {(Object.keys(LANGUAGES) as Language[]).map((code) => (
            <li key={code}>
              <button
                role="option"
                aria-selected={code === language}
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-background ${
                  code === language ? "font-semibold text-brand-dark" : "text-ink"
                }`}
              >
                <span lang={code}>{LANGUAGES[code].label}</span>
                {code === language && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
