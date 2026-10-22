type Props = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

// Page title on the left, actions (month picker, buttons...) on the right
export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex w-full items-center gap-2 sm:w-auto">{children}</div>}
    </div>
  );
}
