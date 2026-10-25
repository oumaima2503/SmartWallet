import { InputHTMLAttributes, useId } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  // Softer than an error: the value should be checked by the user
  warning?: string;
  // Text shown inside the input on the right, e.g. "MAD"
  suffix?: string;
  optional?: boolean;
};

// Label + input + hint/warning/error, with the message linked for screen readers
export default function Field({ label, hint, error, warning, suffix, optional, className = "", ...props }: Props) {
  const id = useId();
  const message = error || warning || hint;
  const messageId = message ? `${id}-message` : undefined;

  const border = error
    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
    : warning
      ? "border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-100"
      : "border-line focus:border-brand focus:ring-brand/15";
  const messageColor = error ? "text-red-600" : warning ? "text-amber-700" : "text-muted";

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={messageId}
          {...props}
          className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            suffix ? "pe-14" : ""
          } ${border}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted">{suffix}</span>
        )}
      </div>
      {message && (
        <p id={messageId} className={`mt-1.5 text-xs ${messageColor}`}>
          {message}
        </p>
      )}
    </div>
  );
}
