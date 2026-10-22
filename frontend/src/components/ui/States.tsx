import { CircleAlert, LucideIcon, RotateCw } from "lucide-react";
import Button from "./Button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

type EmptyProps = {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, text, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50/60 px-6 py-10 text-center">
      <CircleAlert size={28} className="text-red-500" />
      <h3 className="mt-3 font-semibold text-ink">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        <RotateCw size={14} />
        Try again
      </Button>
    </div>
  );
}
