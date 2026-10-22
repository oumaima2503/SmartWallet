"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartColumn,
  LayoutDashboard,
  LucideIcon,
  Menu,
  PiggyBank,
  ScanLine,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import CurrencySwitch from "./CurrencySwitch";

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
];

const ALL_LINKS = GROUPS.flatMap((group) => group.links);
// Phone tab bar: 4 pages + the scan button in the middle
const TAB_LINKS = ["/", "/transactions", "/goals", "/reports"].map((href) => ALL_LINKS.find((l) => l.href === href)!);

type User = { name: string; email: string };

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-sm shadow-brand/30">
        <Wallet size={18} />
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">SmartWallet</span>
    </Link>
  );
}

function Avatar({ user, size = "h-9 w-9" }: { user: User | null; size?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-dark to-brand text-sm font-bold text-white ${size}`}
    >
      {user?.name.charAt(0).toUpperCase() ?? ""}
    </span>
  );
}

function UserCard({ user }: { user: User | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <Avatar user={user} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{user?.name ?? "..."}</p>
        <p className="truncate text-xs text-muted">{user?.email ?? ""}</p>
      </div>
    </div>
  );
}

function NavItem({ link, active, onClick }: { link: NavLink; active: boolean; onClick?: () => void }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-background hover:text-ink"
      }`}
    >
      <Icon size={18} className={active ? "text-emerald-300" : "text-muted group-hover:text-ink"} />
      {link.label}
    </Link>
  );
}

function NavGroups({ isActive, onNavigate }: { isActive: (href: string) => boolean; onNavigate?: () => void }) {
  return (
    <nav className="space-y-5" aria-label="Main">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{group.title}</p>
          <div className="space-y-0.5">
            {group.links.map((link) => (
              <NavItem key={link.href} link={link} active={isActive(link.href)} onClick={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ScanButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <Link
      href="/receipts"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-dark to-brand p-3 text-white shadow-md shadow-brand/25 transition hover:brightness-110"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
        <ScanLine size={18} />
      </span>
      <span>
        <span className="block text-sm font-semibold">Scan a receipt</span>
        <span className="block text-[11px] text-white/75">Photo to expense in seconds</span>
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => {
    api<User>("/api/users/me")
      .then(setUser)
      .catch(() => {});
  }, []);

  // Close the phone menu when the page changes, and with Escape
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-3 py-5 lg:flex">
        <div className="px-3">
          <Logo />
        </div>

        <div className="mt-6 px-0.5">
          <ScanButton active={isActive("/receipts")} />
        </div>

        <div className="thin-scroll mt-6 flex-1 overflow-y-auto">
          <NavGroups isActive={isActive} />
        </div>

        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2 px-2">
            <span className="text-xs font-medium text-muted">Currency</span>
            <CurrencySwitch />
          </div>
          <UserCard user={user} />
        </div>
      </aside>

      {/* ---------- Phone: top bar ---------- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink transition hover:bg-background"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ---------- Phone: menu drawer ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <UserCard user={user} />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4">
              <ScanButton active={isActive("/receipts")} onClick={() => setDrawerOpen(false)} />
            </div>

            <div className="thin-scroll mt-5 flex-1 overflow-y-auto">
              <NavGroups isActive={isActive} onNavigate={() => setDrawerOpen(false)} />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
              <span className="text-xs font-medium text-muted">Currency</span>
              <CurrencySwitch />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Phone: bottom tab bar ---------- */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[TAB_LINKS[0], TAB_LINKS[1], null, TAB_LINKS[2], TAB_LINKS[3]].map((link) => {
            if (!link) {
              return (
                <div key="scan" className="flex justify-center">
                  <Link
                    href="/receipts"
                    aria-label="Scan a receipt"
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
                {link.short}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
