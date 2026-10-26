"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { confetti } from "@/lib/motion";
import AssistantLogo from "@/components/chat/AssistantLogo";
import { CLOSE_CHAT_EVENT, OPEN_CHAT_EVENT } from "@/components/chat/ChatAssistant";

// Guided tour for new users. It opens each page and puts a spotlight on its main features,
// then opens the AI assistant and shows its parts.
// Targets are elements marked with data-tour="..." (menu, top bar, page sections, chat panel).

export const START_TOUR_EVENT = "smartwallet:start-tour";
// Set right after sign-up, so the tour starts on the first visit
export const TOUR_PENDING_KEY = "smartwallet.tour.pending";

type Step = {
  title: string;
  text: string;
  target?: string;
  // Page to open for this step
  route?: string;
  // Section name shown on the card
  section?: string;
  // The chat panel must be open
  chat?: boolean;
  // Skipped when the element doesn't exist (e.g. no data yet for a new user)
  optional?: boolean;
  // Where to find the target when it is not on screen (phones)
  hidden?: string;
};

const STEPS: Step[] = [
  { title: "Welcome to SmartWallet, {name}!", text: "I'm your SmartWallet guide. Let me show you around in one minute. You can skip at any time." },

  // Dashboard
  { section: "Dashboard", route: "/", target: "nav-dashboard", title: "Your dashboard", text: "Your balance, income, expenses, budgets and goals for the month, all on one page." },
  { section: "Dashboard", route: "/", target: "dash-month", title: "Pick a month", text: "Open the calendar to see the numbers of any month." },
  { section: "Dashboard", route: "/", target: "dash-kpis", title: "Your month in numbers", text: "Balance, income, expenses and money saved, compared with last month." },
  { section: "Dashboard", route: "/", target: "dash-charts", title: "Charts", text: "Income vs expenses over 6 months (tap a month to open it) and where your money goes by category." },
  { section: "Dashboard", route: "/", target: "dash-ai", title: "AI insights", text: "A short summary of your monthly AI report: what goes well and what to watch." },

  // Transactions
  { section: "Transactions", route: "/transactions", target: "nav-transactions", title: "Transactions", text: "Every income and expense you record is listed here." },
  { section: "Transactions", route: "/transactions", target: "tx-add", title: "Add a transaction", text: "Add an income or an expense in a few seconds. The buttons next to it scan a receipt or manage your categories." },
  { section: "Transactions", route: "/transactions", target: "tx-summary", title: "The period at a glance", text: "Your balance, biggest expense, top category and the store you visit most." },
  { section: "Transactions", route: "/transactions", target: "tx-calendar", optional: true, title: "Spending calendar", text: "Darker days are the days you spent the most. You also see your average per day and your no-spend days." },
  { section: "Transactions", route: "/transactions", target: "tx-filters", title: "Search and filters", text: "Find any transaction by store or description, or filter by type and category." },
  { section: "Transactions", route: "/transactions", target: "tx-list", title: "Your timeline", text: "Transactions are grouped by week. Click a card to edit or delete it." },

  // Receipts
  { section: "Scan a receipt", route: "/receipts", target: "scan", title: "Scan a receipt", text: "Take a photo of a receipt: the AI reads the store, date and total and suggests a category. You just confirm." },
  { section: "Scan a receipt", route: "/receipts", target: "scan-upload", title: "Take or upload a photo", text: "Use your camera or choose a photo. Any currency works, and you check every detail before it is saved." },
  { section: "Scan a receipt", route: "/receipts", target: "scan-history", title: "Scan history", text: "Every receipt you scanned, saved or not. You can finish an unsaved one at any time." },

  // Budgets
  { section: "Budgets", route: "/budgets", target: "nav-budgets", title: "Budgets", text: "Set a monthly limit, overall or per category. You get an alert at 80% and when you go over." },
  { section: "Budgets", route: "/budgets", target: "budget-add", title: "Create a budget", text: "Choose the month, then add an overall limit or a limit for one category." },
  { section: "Budgets", route: "/budgets", target: "budget-main", title: "Follow every limit", text: "Each ring shows how much of a budget is used. It turns orange at 80% and red when you go over." },

  // Goals
  { section: "Savings goals", route: "/goals", target: "nav-goals", title: "Savings goals", text: "Saving for a laptop, a trip or an emergency fund? Add money to a goal and follow your progress." },
  { section: "Savings goals", route: "/goals", target: "goals-main", title: "Your goals", text: "See how much you saved, what is left and how much to put aside each month. Add money in one click." },

  // Reports
  { section: "AI reports", route: "/reports", target: "nav-reports", title: "AI reports", text: "Each month, the AI explains your real numbers: what changed, which budgets to watch and what to improve." },
  { section: "AI reports", route: "/reports", target: "report-main", title: "Your monthly report", text: "Generate the report of the selected month. The numbers are calculated by the app, the AI explains them, and you can download it as a PDF." },

  // Top bar
  { section: "Everywhere", target: "notifications", title: "Budget alerts", text: "This bell lights up when a budget gets close to its limit or goes over it." },
  {
    section: "Everywhere",
    target: "preferences",
    title: "Make it yours",
    text: "Switch between light and dark mode, choose your language and show amounts in MAD, euros or dollars.",
    hidden: "On this screen, tap your profile photo at the top to find these options.",
  },

  // Assistant
  { section: "AI assistant", target: "assistant", title: "Ask the AI assistant", text: "Have a question about your money? This button opens the assistant on every page." },
  { section: "AI assistant", chat: true, target: "chat-header", title: "Connected to your data", text: "The assistant reads your transactions, budgets and goals live. The trash icon starts a new conversation." },
  { section: "AI assistant", chat: true, target: "chat-body", title: "Ask anything", text: "Start with a suggested question or write your own. Amounts are highlighted, and follow-up ideas appear after each answer." },
  { section: "AI assistant", chat: true, target: "chat-input", title: "Write your question", text: "Type here and press Enter. Answers come in your language and your currency." },

  { title: "You're all set!", text: "Start by adding your income, then set a budget for the month. You can replay this tour from your profile menu." },
];

const CARD_WIDTH = 340;
const GAP = 14;
const PAD = 6;
// Time to let a page load before saying the element isn't on screen
const WAIT_MS = 2500;

type Rect = { top: number; left: number; width: number; height: number };

// First element with this data-tour that is actually visible (sidebar on desktop, tab bar on phones)
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const box = el.getBoundingClientRect();
    if (box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

// Scrolls the page so the element sits just below the sticky top bar, leaving room for the card under it.
// Nothing moves when the element and the card already fit (menu, top bar and other fixed elements).
function bringIntoView(el: HTMLElement) {
  const box = el.getBoundingClientRect();
  const topBar = 72;
  const roomForCard = 290;
  const visible = box.top >= 0 && box.bottom <= window.innerHeight;
  if (visible && (window.innerHeight - box.bottom > roomForCard || box.top > roomForCard)) return;
  window.scrollTo({ top: Math.max(window.scrollY + box.top - topBar - 12, 0), behavior: "smooth" });
}

function placeCard(target: Rect | null, cardHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - 32);
  const clampX = (x: number) => Math.min(Math.max(x, 16), vw - width - 16);
  const clampY = (y: number) => Math.min(Math.max(y, 16), vh - cardHeight - 16);

  if (!target) return { top: clampY((vh - cardHeight) / 2), left: (vw - width) / 2, width };

  const spaceRight = vw - (target.left + target.width);
  const spaceLeft = target.left;
  const spaceBelow = vh - (target.top + target.height);
  const spaceAbove = target.top;

  // Next to the target (menu items, chat panel, narrow sections)
  if (Math.max(spaceRight, spaceLeft) > width + GAP * 2 && (target.height > 120 || target.left < 300 || spaceRight < 300)) {
    const left = spaceRight >= spaceLeft ? target.left + target.width + GAP : target.left - width - GAP;
    return { top: clampY(target.top + Math.min(target.height, vh) / 2 - cardHeight / 2), left: clampX(left), width };
  }
  // Below or above
  if (spaceBelow > cardHeight + GAP * 2) return { top: target.top + target.height + GAP, left: clampX(target.left + target.width / 2 - width / 2), width };
  if (spaceAbove > cardHeight + GAP * 2) return { top: target.top - cardHeight - GAP, left: clampX(target.left + target.width / 2 - width / 2), width };
  // Very large section: the card sits at the bottom of the screen, over it
  return { top: vh - cardHeight - 16, left: clampX(target.left + target.width / 2 - width / 2), width };
}

export default function AppTour() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const [cardHeight, setCardHeight] = useState(240);
  const cardRef = useRef<HTMLDivElement>(null);
  // 1 = going forward, -1 = going back (to skip optional steps in the right direction)
  const direction = useRef(1);

  const go = useCallback((next: number) => {
    setStep((current) => {
      if (current !== null) direction.current = next >= current ? 1 : -1;
      return Math.min(Math.max(next, 0), STEPS.length - 1);
    });
  }, []);

  // Start for a new account (flag set at sign-up) or when asked from the profile menu
  useEffect(() => {
    let pending = false;
    try {
      pending = localStorage.getItem(TOUR_PENDING_KEY) === "1";
    } catch {
      // ignore
    }
    const timer = pending ? setTimeout(() => setStep(0), 900) : undefined;
    const onStart = () => {
      direction.current = 1;
      setStep(0);
    };
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(START_TOUR_EVENT, onStart);
    };
  }, []);

  const finish = useCallback(() => {
    setStep(null);
    window.dispatchEvent(new Event(CLOSE_CHAT_EVENT));
    try {
      localStorage.removeItem(TOUR_PENDING_KEY);
    } catch {
      // ignore
    }
  }, []);

  const current = step === null ? null : STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Open the right page, and open / close the chat panel
  useEffect(() => {
    if (!current) return;
    if (current.route && current.route !== pathname) router.push(current.route);
    window.dispatchEvent(new Event(current.chat ? OPEN_CHAT_EVENT : CLOSE_CHAT_EVENT));
    // pathname is left out on purpose: navigating must not re-run this for the same step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, router]);

  // Follow the target (pages load, the window is resized, the page scrolls)
  useEffect(() => {
    if (!current || step === null) return;
    setRect(null);
    setMissing(false);
    if (!current.target) return;

    const startedAt = Date.now();
    let scrolled = false;
    const measure = () => {
      const el = findTarget(current.target!);
      if (!el) {
        setRect(null);
        if (Date.now() - startedAt > WAIT_MS) {
          if (current.optional) go(step + direction.current);
          else setMissing(true);
        }
        return;
      }
      if (!scrolled) {
        scrolled = true;
        bringIntoView(el);
      }
      const box = el.getBoundingClientRect();
      // Only the visible part of very tall sections is lit
      const top = Math.max(box.top, 0);
      const bottom = Math.min(box.bottom, window.innerHeight);
      const next = { top, left: box.left, width: box.width, height: Math.max(bottom - top, 0) };
      setMissing(false);
      setRect((old) =>
        old && old.top === next.top && old.left === next.left && old.width === next.width && old.height === next.height ? old : next
      );
    };
    measure();
    const interval = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
    };
  }, [current, step, go]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [step, rect, missing]);

  useEffect(() => {
    if (step === null) return;
    cardRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight" || event.key === "Enter") go(step + 1);
      if (event.key === "ArrowLeft") go(step - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, finish, go]);

  // A little celebration at the end
  useEffect(() => {
    if (isLast) confetti(70);
  }, [isLast]);

  if (step === null || !current) return null;

  const spotlight = rect && rect.height > 0 && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  const card = placeCard(spotlight || null, cardHeight);
  const centered = !current.target;
  const loading = !!current.target && !spotlight && !missing;
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t("App tour")}>
      {/* Dark layer with a hole around the target */}
      {spotlight ? (
        <div
          className="pointer-events-none fixed rounded-2xl transition-all duration-300 ease-out"
          style={{ ...spotlight, boxShadow: "0 0 0 9999px rgba(8, 18, 13, 0.62)" }}
        >
          <span className="absolute inset-0 animate-pulse rounded-2xl ring-2 ring-emerald-300/80" />
        </div>
      ) : (
        <div className="fixed inset-0 bg-[#08120d]/60 backdrop-blur-[2px]" />
      )}
      {/* Clicks outside the card do nothing (the tour stays until skipped or finished) */}
      <div className="fixed inset-0" />

      <div
        ref={cardRef}
        tabIndex={-1}
        className="fixed overflow-hidden rounded-3xl border border-line bg-white text-ink shadow-2xl shadow-black/30 outline-none transition-all duration-300 ease-out"
        style={{ top: card.top, left: card.left, width: card.width }}
      >
        {/* Progress */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-gradient-to-r from-brand to-emerald-400 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className={`p-5 ${centered ? "text-center" : ""}`}>
          <div className={`flex items-start gap-3 ${centered ? "flex-col items-center" : ""}`}>
            <span className={`relative shrink-0 ${centered ? "float" : ""}`}>
              {centered && <span className="absolute inset-0 rounded-full bg-brand/20 blur-xl" aria-hidden="true" />}
              <AssistantLogo size={centered ? 64 : 38} className="relative" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted ${centered ? "justify-center" : ""}`}>
                {current.section && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 uppercase tracking-wider text-brand-dark">{t(current.section)}</span>
                )}
                <span>{t("Step {current} of {total}", { current: step + 1, total: STEPS.length })}</span>
              </p>
              <h2 className="mt-1.5 font-display text-lg font-semibold leading-snug text-ink">{t(current.title, { name: firstName })}</h2>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t(current.text)}</p>
          {loading && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              {t("Opening the page...")}
            </p>
          )}
          {missing && <p className="mt-2 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-dark">{t(current.hidden ?? "On this screen, you'll find it in the menu ☰.")}</p>}

          <div className="mt-5 flex items-center gap-2">
            {!isLast && (
              <button onClick={finish} className="me-auto rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition hover:text-ink">
                {t("Skip the tour")}
              </button>
            )}
            {isLast && <span className="me-auto" />}
            {step > 0 && (
              <button
                onClick={() => go(step - 1)}
                aria-label={t("Back")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink transition hover:bg-background"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            {isLast ? (
              <>
                <button onClick={finish} className="h-9 rounded-xl border border-line px-3.5 text-sm font-semibold text-ink transition hover:bg-background">
                  {t("Close")}
                </button>
                <button
                  onClick={() => {
                    finish();
                    router.push("/transactions");
                  }}
                  className="h-9 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:brightness-110"
                >
                  {t("Add my income")}
                </button>
              </>
            ) : (
              <button
                onClick={() => go(step + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-4 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:brightness-110"
              >
                {step === 0 ? t("Start the tour") : t("Next")}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
