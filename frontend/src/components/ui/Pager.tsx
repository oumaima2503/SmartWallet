"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@/lib/i18n";

// Splits a list into pages. The page goes back into range when the list gets shorter (e.g. another month).
export function usePaged<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(0);
  const pages = Math.max(Math.ceil(items.length / perPage), 1);

  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);

  const current = Math.min(page, pages - 1);
  return {
    page: current,
    pages,
    setPage,
    visible: items.slice(current * perPage, current * perPage + perPage),
    from: items.length === 0 ? 0 : current * perPage + 1,
    to: Math.min((current + 1) * perPage, items.length),
    total: items.length,
  };
}

type Props = {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
};

// "1–4 of 10" + previous / next + dots. Hidden when everything fits on one page.
export default function Pager({ page, pages, from, to, total, onChange }: Props) {
  if (pages <= 1) return null;
  const arrow =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand-dark disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3" aria-label={t("Pages")}>
      <span className="text-[11px] text-muted" dir="ltr">
        {t("{from}–{to} of {total}", { from, to, total })}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(page - 1)} disabled={page === 0} aria-label={t("Previous page")} className={arrow}>
          <ChevronLeft size={15} />
        </button>
        {pages <= 6 && (
          <span className="flex items-center gap-1 px-0.5">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => onChange(i)}
                aria-label={t("Page {number}", { number: i + 1 })}
                aria-current={i === page ? "page" : undefined}
                className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-brand" : "w-1.5 bg-line hover:bg-muted"}`}
              />
            ))}
          </span>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === pages - 1} aria-label={t("Next page")} className={arrow}>
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
