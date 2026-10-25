"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/lib/i18n";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
};

// Password input with a show / hide button
export default function PasswordField({ label, value, onChange, autoComplete, error, hint }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const { t } = useT();
  const message = error || hint;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={message ? `${id}-message` : undefined}
          className={`h-11 w-full rounded-xl border bg-white px-3 pe-11 text-sm text-ink outline-none transition focus:ring-4 ${
            error ? "border-red-400 focus:ring-red-100" : "border-line focus:border-brand focus:ring-brand/15"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={t(visible ? "Hide password" : "Show password")}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted hover:text-ink"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {message && (
        <p id={`${id}-message`} className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
