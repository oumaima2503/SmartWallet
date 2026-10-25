"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellRing, ChevronDown, CircleAlert, Download, LogOut, Menu, TriangleAlert, UserRound, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";
import { useBudgetAlerts } from "@/lib/budgetAlerts";
import Avatar from "@/components/ui/Avatar";
import { useFeedback } from "@/components/ui/Feedback";
import CurrencySwitch from "./CurrencySwitch";
import LanguageSwitch from "./LanguageSwitch";
import ThemeToggle from "./ThemeToggle";

// Closes a popup on outside click or Escape
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && close();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function NotificationsBell() {
  const { money } = useCurrency();
  const { toast } = useFeedback();
  const { alerts, unread, markAllRead } = useBudgetAlerts();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const toasted = useRef<Set<string>>(new Set());

  // Pop-up once per session for each new alert
  useEffect(() => {
    for (const alert of unread) {
      const sessionKey = `smartwallet.alert.toasted.${alert.key}`;
      if (toasted.current.has(alert.key)) continue;
      toasted.current.add(alert.key);
      try {
        if (sessionStorage.getItem(sessionKey)) continue;
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // ignore
      }
      toast.error(alert.title);
    }
  }, [unread, toast]);

  function toggle() {
    setOpen(!open);
    if (!open && unread.length > 0) markAllRead();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={`${t("Notifications")}${unread.length ? ` (${unread.length})` : ""}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:bg-background"
      >
        {unread.length > 0 ? <BellRing size={18} className="text-amber-600" /> : <Bell size={18} />}
        {unread.length > 0 && (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("Notifications")}
          className="absolute end-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">{t("Budget alerts")}</p>
            <span className="text-xs text-muted">{t("This month")}</span>
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={22} className="mx-auto text-muted" />
              <p className="mt-2 text-sm font-medium text-ink">{t("All good")}</p>
              <p className="text-xs text-muted">{t("No budget is close to its limit.")}</p>
            </div>
          ) : (
            <ul className="thin-scroll max-h-80 divide-y divide-line overflow-y-auto">
              {alerts.map((alert) => {
                const exceeded = alert.level === "exceeded";
                const Icon = exceeded ? CircleAlert : TriangleAlert;
                const remaining = Number(alert.budget.remaining);
                return (
                  <li key={alert.key}>
                    <Link href="/budgets" onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 transition hover:bg-background">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          exceeded ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{alert.title}</span>
                        <span className="block text-xs text-muted">
                          {t("{spent} of {limit}", { spent: money(Number(alert.budget.spent)), limit: money(Number(alert.budget.amount_limit)) })} ·{" "}
                          {remaining >= 0 ? t("{amount} left", { amount: money(remaining) }) : t("{amount} over", { amount: money(-remaining) })}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/budgets"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-brand hover:bg-background"
          >
            {t("See all budgets")}
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const { toast } = useFeedback();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.success(t("You are logged out."));
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-background";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("Profile menu")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl p-1 pe-2 transition hover:bg-background"
      >
        <Avatar name={user?.name} src={user?.avatar} size={36} />
        <span className="hidden text-start md:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-ink">{user?.name}</span>
          <span className="block max-w-[10rem] truncate text-[11px] leading-tight text-muted">{user?.email}</span>
        </span>
        <ChevronDown size={15} className={`hidden text-muted transition md:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-3 border-b border-line px-2 pb-3 pt-1">
            <Avatar name={user?.name} src={user?.avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/profile" onClick={() => setOpen(false)} className={item}>
              <UserRound size={16} className="text-muted" />
              {t("My profile")}
            </Link>
            <Link href="/export" onClick={() => setOpen(false)} className={item}>
              <Download size={16} className="text-muted" />
              {t("Export my data")}
            </Link>
            <div className="flex items-center justify-between px-3 py-2 sm:hidden">
              <span className="text-sm text-ink">{t("Currency")}</span>
              <CurrencySwitch />
            </div>
            <div className="flex items-center justify-between px-3 py-2 sm:hidden">
              <span className="text-sm text-ink">{t("Language")}</span>
              <LanguageSwitch />
            </div>
            <div className="flex items-center justify-between px-3 py-2 sm:hidden">
              <span className="text-sm text-ink">{t("Theme")}</span>
              <ThemeToggle />
            </div>
            <button onClick={handleLogout} className={`${item} text-red-600 hover:!bg-red-50`}>
              <LogOut size={16} />
              {t("Log out")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// "Good morning, Yassine" + today's date. Computed in the browser only
// (the server clock can be in another time zone and cause a hydration mismatch)
function Greeting() {
  const { user } = useAuth();
  const { t, locale } = useT();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  if (!now) return null;

  const firstName = user?.name.split(" ")[0];
  return (
    <div className="hidden min-w-0 lg:block">
      <p className="truncate font-display text-base font-bold leading-tight tracking-tight text-ink">
        {t(greetingFor(now.getHours()))}
        {firstName ? `, ${firstName}` : ""} 👋
      </p>
      <p className="truncate text-xs text-muted">
        {now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
      </p>
    </div>
  );
}

// Bar at the top of every page: (phone: logo + menu) · currency · notifications · profile
export default function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onOpenMenu}
          aria-label={t("Open menu")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink transition hover:bg-background lg:hidden"
        >
          <Menu size={19} />
        </button>
        <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="SmartWallet home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white">
            <Wallet size={17} />
          </span>
          <span className="hidden text-base font-bold tracking-tight text-ink min-[400px]:block">SmartWallet</span>
        </Link>
        <Greeting />

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <LanguageSwitch className="hidden sm:block" />
          <CurrencySwitch className="hidden sm:inline-flex" />
          <NotificationsBell key={pathname === "/budgets" ? "budgets" : "app"} />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
