"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Sidebar from "./Sidebar";

// Pages anyone can open
const PUBLIC_PAGES = ["/login", "/register"];

// Route guard: logged-out users go to /login (and come back after), logged-in users skip /login
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    if (status === "anonymous" && !isPublic) {
      const next = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
    if (status === "authenticated" && isPublic) {
      const next = new URLSearchParams(window.location.search).get("next");
      // Only same-site paths, never a full URL
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    }
  }, [status, isPublic, pathname, router]);

  // Login and register pages: full screen, no sidebar
  if (isPublic) {
    return status === "authenticated" ? <SplashScreen /> : <>{children}</>;
  }

  // Protected pages: never show them before we know the user is logged in
  if (status !== "authenticated") return <SplashScreen />;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-lg shadow-brand/30">
        <Wallet size={22} />
      </span>
      <p className="text-sm text-muted">Loading SmartWallet...</p>
    </div>
  );
}
