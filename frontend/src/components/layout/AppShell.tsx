"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ChatAssistant from "@/components/chat/ChatAssistant";
import AppTour from "@/components/tour/AppTour";

// Pages anyone can open
const PUBLIC_PAGES = ["/welcome", "/login", "/register"];

// Route guard: logged-out users go to /login (and come back after), logged-in users skip /login
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PAGES.includes(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (status === "anonymous" && !isPublic) {
      // The home page shows the landing page; other private pages ask to log in (and come back after)
      if (pathname === "/") router.replace("/welcome");
      else router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
      <Sidebar drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />
      <div className="min-w-0 flex-1">
        <TopBar onOpenMenu={() => setDrawerOpen(true)} />
        {children}
      </div>
      <ChatAssistant />
      <AppTour />
    </div>
  );
}

function SplashScreen() {
  const { t } = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-label={t("Loading")}>
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-dark to-brand text-white shadow-lg shadow-brand/30">
        <Wallet size={22} />
      </span>
      <p className="text-sm text-muted">{t("Loading SmartWallet...")}</p>
    </div>
  );
}
