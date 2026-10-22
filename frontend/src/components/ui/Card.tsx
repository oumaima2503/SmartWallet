type Props = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

// Compact white card; flex column so cards in the same row can share the same height (h-full)
export default function Card({ title, subtitle, action, className = "", children }: Props) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,31,23,0.04)] sm:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 text-xs">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
