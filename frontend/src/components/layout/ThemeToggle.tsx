"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n";

// Moon / sun button that switches between light and dark mode
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useT();
  const label = t(theme === "dark" ? "Light mode" : "Dark mode");

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:bg-background ${className}`}
    >
      {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
    </button>
  );
}
