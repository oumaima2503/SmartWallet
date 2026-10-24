import { SelectHTMLAttributes, useId } from "react";
import { ChevronDown } from "lucide-react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

// Styled select matching the Field inputs
export default function Select({ label, error, hint, className = "", children, ...props }: Props) {
  const id = useId();
  const message = error || hint;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={message ? `${id}-message` : undefined}
          {...props}
          className={`h-11 w-full appearance-none rounded-xl border bg-white pl-3 pr-9 text-sm text-ink outline-none transition focus:ring-4 ${
            error ? "border-red-400 focus:ring-red-100" : "border-line focus:border-brand focus:ring-brand/15"
          }`}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
      {message && (
        <p id={`${id}-message`} className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
