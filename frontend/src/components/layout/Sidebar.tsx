"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartColumn,
  Download,
  LayoutDashboard,
  LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  ScanLine,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import Avatar from "@/components/ui/Avatar";
import CurrencySwitch from "./CurrencySwitch";
import LanguageSwitch from "./LanguageSwitch";

type NavLink = { href: string; label: string; short: string; icon: LucideIcon };

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Overview",
    links: [
      { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", short: "History", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Planning",
    links: [
      { href: "/budgets", label: "Budgets", short: "Budgets", icon: PiggyBank },
      { href: "/goals", label: "Savings goals", short: "Goals", icon: Target },
      { href: "/reports", label: "AI reports", short: "Reports", icon: ChartColumn },
    ],
  },
  {
    title: "Tools",
    links: [{ href: "/export", label: "Export data", short: "Export", icon: Download }],
  },
];

const ALL_LINKS = GROUPS.flatMap((group) => group.links);
// Phone tab bar: 4 pages + the scan button in the middle
const TAB_LINKS = ["/", "/transactions", "/goals", "/reports"].map((href) => ALL_LINKS.find((l) => l.href === href)!);

const COLLAPSED_KEY = "smartwallet.sidebar.collapsed";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="SmartWallet home">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-sm shadow-brand/30">
        <Wallet size={18} />
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">SmartWallet</span>
    </Link>
  );
}

function NavGroups({
  isActive,
  compact = false,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useT();
  return (
    <nav className="space-y-5" aria-label={t("Main")}>
      {GROUPS.map((group) => (
        <div key={group.title}>
          {compact ? (
            <div className="mx-auto mb-2 h-px w-6 bg-line" />
          ) : (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{t(group.title)}</p>
          )}
          <div className="space-y-0.5">
            {group.links.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  title={compact ? t(link.label) : undefined}
                  aria-label={compact ? t(link.label) : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition ${
                    compact ? "justify-center px-0" : "px-3"
                  } ${active ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-background hover:text-ink"}`}
                >
                  <Icon size={18} className={active ? "text-emerald-300" : "text-muted group-hover:text-ink"} />
                  {!compact && t(link.label)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ScanButton({ active, compact = false, onClick }: { active: boolean; compact?: boolean; onClick?: () => void }) {
  const { t } = useT();
  if (compact) {
    return (
      <Link
        href="/receipts"
        onClick={onClick}
        title={t("Scan a receipt")}
        aria-label={t("Scan a receipt")}
        aria-current={active ? "page" : undefined}
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-md shadow-brand/25 transition hover:brightness-110"
      >
        <ScanLine size={19} />
      </Link>
    );
  }
  return (
    <Link
      href="/receipts"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-dark to-brand p-3 text-white shadow-md shadow-brand/25 transition hover:brightness-110"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <ScanLine size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{t("Scan a receipt")}</span>
        <span className="block truncate text-[11px] text-white/75">{t("Photo to expense in seconds")}</span>
      </span>
    </Link>
  );
}

type Props = { drawerOpen: boolean; onCloseDrawer: () => void };

export default function Sidebar({ drawerOpen, onCloseDrawer }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useT();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Remember the folded / unfolded choice in this browser
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  // Close the phone menu when the page changes; lock the page scroll while it is open
  useEffect(() => onCloseDrawer(), [pathname, onCloseDrawer]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCloseDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, onCloseDrawer]);

  return (
    <>
      {/* ---------- Desktop sidebar (can be folded to icons) ---------- */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-white py-4 transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px] px-2" : "w-64 px-3"
        }`}
      >
        <div className={`flex h-12 items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
          {!collapsed && <Logo />}
          <button
            onClick={toggleCollapsed}
            aria-label={t(collapsed ? "Expand the menu" : "Collapse the menu")}
            title={t(collapsed ? "Expand the menu" : "Collapse the menu")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-background hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen size={18} className="rtl:-scale-x-100" /> : <PanelLeftClose size={18} className="rtl:-scale-x-100" />}
          </button>
        </div>

        <div className="thin-scroll mt-5 flex-1 overflow-y-auto overflow-x-hidden">
          <NavGroups isActive={isActive} compact={collapsed} />
        </div>

        <div className="pt-4">
          <ScanButton active={isActive("/receipts")} compact={collapsed} />
        </div>
      </aside>

      {/* ---------- Phone: menu drawer ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onCloseDrawer} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Menu")}
            className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                onClick={onCloseDrawer}
                aria-label={t("Close menu")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <Link
              href="/profile"
              onClick={onCloseDrawer}
              className="mt-4 flex items-center gap-3 rounded-xl border border-line p-2.5 transition hover:bg-background"
            >
              <Avatar name={user?.name} src={user?.avatar} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{user?.name}</span>
                <span className="block truncate text-xs text-muted">{t("View my profile")}</span>
              </span>
            </Link>

            <div className="thin-scroll mt-5 flex-1 overflow-y-auto">
              <NavGroups isActive={isActive} onNavigate={onCloseDrawer} />
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">{t("Currency")}</span>
                <CurrencySwitch />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted">{t("Language")}</span>
                <LanguageSwitch />
              </div>
              <ScanButton active={isActive("/receipts")} onClick={onCloseDrawer} />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Phone: bottom tab bar ---------- */}
      <nav
        aria-label={t("Quick navigation")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[TAB_LINKS[0], TAB_LINKS[1], null, TAB_LINKS[2], TAB_LINKS[3]].map((link) => {
            if (!link) {
              return (
                <div key="scan" className="flex justify-center">
                  <Link
                    href="/receipts"
                    aria-label={t("Scan a receipt")}
                    className={`-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-brand/40 ring-4 ring-white transition active:scale-95 ${
                      isActive("/receipts") ? "bg-brand-dark" : "bg-gradient-to-br from-brand-dark to-brand"
                    }`}
                  >
                    <ScanLine size={24} />
                  </Link>
                </div>
              );
            }
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-brand-dark" : "text-muted"
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {t(link.short)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
