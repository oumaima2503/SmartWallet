"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/savings", label: "Savings" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-600">
          SmartWallet
        </Link>
        <div className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-900"}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
