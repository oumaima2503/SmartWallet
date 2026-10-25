"use client";

import { useT } from "@/lib/i18n";

type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

// Slim page header: title (+ short subtitle on larger screens) on the left, actions on the right.
// Kept small on purpose: the greeting and profile already live in the top bar.
export default function PageHeader({ title, subtitle, children }: Props) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-ink">{t(title)}</h1>
        {subtitle && <p className="hidden truncate text-xs text-muted sm:block">{t(subtitle)}</p>}
      </div>
      {/* Wraps on narrow screens so the actions never push the page wider than the phone */}
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">{children}</div>}
    </div>
  );
}
