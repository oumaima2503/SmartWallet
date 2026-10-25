"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  ChartColumn,
  CircleCheck,
  Download,
  Globe,
  Lightbulb,
  PiggyBank,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import Tilt from "@/components/landing/Tilt";
import CountUp from "@/components/landing/CountUp";
import LanguageSwitch from "@/components/layout/LanguageSwitch";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useT } from "@/lib/i18n";

// Public landing page, shown before login

const FEATURES = [
  { icon: Wallet, title: "Every dirham in one place", text: "Record income and expenses, search them and organize them with your own categories." },
  { icon: ScanLine, title: "Scan your receipts", text: "Take a photo: the store, date and total are read for you, in any currency." },
  { icon: PiggyBank, title: "Budgets that warn you", text: "Monthly limits per category, with alerts at 80% and when you go over." },
  { icon: Target, title: "Savings goals", text: "A laptop, a trip, an emergency fund: see how much is left and how much to save per month." },
  { icon: Sparkles, title: "AI monthly reports", text: "A clear summary of your month, budget concerns and practical tips based on real numbers." },
  { icon: Download, title: "Your data, your way", text: "Show amounts in MAD, euros or dollars and export everything to Excel or PDF." },
];

const STEPS = [
  { title: "Create your account", text: "Free, in less than a minute. No bank connection needed." },
  { title: "Add your money moves", text: "Type them in or scan your receipts. Set a budget and a goal." },
  { title: "Understand and improve", text: "Your dashboard and AI report show what to adjust next month." },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          light ? "bg-white/15 text-white" : "bg-gradient-to-br from-brand-dark to-brand text-white shadow-sm shadow-brand/30"
        }`}
      >
        <Wallet size={18} />
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>SmartWallet</span>
    </span>
  );
}

// A small, realistic preview of the app made with plain HTML (no screenshot needed)
function AppPreview() {
  const { t } = useT();
  const bars = [42, 58, 50, 70, 62, 48];
  return (
    <div className="rise relative mx-auto w-full max-w-md" style={{ "--d": "350ms" } as React.CSSProperties}>
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand/20 via-emerald-200/30 to-violet-300/30 blur-2xl" aria-hidden="true" />
      <Tilt className="relative rounded-3xl border border-white/60 bg-white/80 p-4 shadow-2xl shadow-ink/10 backdrop-blur">
        {/* Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-[#0b7d45] to-brand p-4 text-white">
          <span className="absolute -end-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <p className="text-xs text-white/75">{t("Balance this month")}</p>
          <p dir="ltr" className="text-start font-display text-2xl font-bold rtl:text-end">
            <CountUp value={5095} />
            <span className="text-sm font-medium opacity-70">.00 MAD</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="fill-in h-full w-[43%] rounded-full bg-white" />
          </div>
          <p className="mt-1.5 text-[11px] text-white/80">{t("43% of your income spent")}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {/* Mini chart */}
          <div className="rounded-2xl border border-line bg-white p-3">
            <p className="text-[11px] font-semibold text-ink">{t("Expenses")}</p>
            <div className="mt-2 flex h-16 items-end gap-1.5">
              {bars.map((height, i) => (
                <span
                  key={i}
                  className={`grow flex-1 rounded-t ${i === bars.length - 1 ? "bg-ink" : "bg-brand/30"}`}
                  style={{ height: `${height}%`, "--d": `${600 + i * 90}ms` } as React.CSSProperties}
                />
              ))}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand">
              <TrendingDown size={11} /> {t("20.8% vs last month")}
            </p>
          </div>
          {/* Receipt */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-3">
            <span className="scan-line pointer-events-none absolute inset-x-0 h-0.5 bg-brand/50 shadow-[0_0_8px_2px_rgba(10,143,79,0.35)]" aria-hidden="true" />
            <p className="flex items-center gap-1 text-[11px] font-semibold text-ink">
              <ScanLine size={12} className="text-brand" /> {t("Receipt read")}
            </p>
            <div className="mt-2 space-y-1 text-[10px] text-muted">
              <p className="flex justify-between"><span>Marjane</span><span>18 Oct</span></p>
              <p className="flex justify-between"><span>{t("Groceries")}</span><span className="font-semibold text-ink">72.50 MAD</span></p>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
              <CircleCheck size={10} /> {t("Added")}
            </span>
          </div>
        </div>

        {/* AI tip */}
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-violet-50 p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Sparkles size={14} />
          </span>
          <p className="text-[11px] leading-snug text-ink">
            <span className="font-semibold">{t("Transport is at 88% of its budget.")}</span> {t("Plan your trips for the last week of the month.")}
          </p>
        </div>
      </Tilt>

      {/* Floating chips */}
      <div className="float absolute -start-4 top-24 hidden items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 shadow-lg sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <BellRing size={14} />
        </span>
        <span className="text-[11px] font-semibold text-ink">{t("Budget alert")}</span>
      </div>
      <div className="float absolute -end-4 bottom-20 hidden items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2 shadow-lg sm:flex" style={{ "--d": "-2000ms" } as React.CSSProperties}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Target size={14} />
        </span>
        <span className="text-[11px] font-semibold text-ink">{t("Laptop goal · 28%")}</span>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-20 border-b border-line/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted md:flex" aria-label="Sections">
            <a href="#features" className="transition hover:text-ink">{t("Features")}</a>
            <a href="#how" className="transition hover:text-ink">{t("How it works")}</a>
            <a href="#ai" className="transition hover:text-ink">{t("AI reports")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:flex" />
            <LanguageSwitch />
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-ink transition hover:bg-white">
              {t("Log in")}
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark"
            >
              {t("Get started")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -start-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl drift" aria-hidden="true" />
          <div className="pointer-events-none absolute -end-32 top-20 h-[24rem] w-[24rem] rounded-full bg-violet-300/20 blur-3xl drift [animation-delay:-7s]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
            <div>
              <span className="rise inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-semibold text-brand-dark">
                <Sparkles size={13} /> {t("AI-powered personal finance")}
              </span>
              <h1 className="rise mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl" style={{ "--d": "100ms" } as React.CSSProperties}>
                {t("Smarter money for a")} <span className="shine bg-gradient-to-r from-brand via-emerald-400 to-brand bg-clip-text text-transparent">{t("better tomorrow")}</span>
              </h1>
              <p className="rise mt-5 max-w-lg text-base text-muted sm:text-lg" style={{ "--d": "200ms" } as React.CSSProperties}>
                {t("Track your spending, stay within your budgets and reach your savings goals. Snap a receipt and let AI do the boring part.")}
              </p>
              <div className="rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ "--d": "300ms" } as React.CSSProperties}>
                <Link
                  href="/register"
                  className="pulse-ring group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                >
                  {t("Create a free account")}
                  <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-6 text-sm font-semibold text-ink transition hover:border-ink/20"
                >
                  {t("I already have an account")}
                </Link>
              </div>
              <ul className="rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" style={{ "--d": "400ms" } as React.CSSProperties}>
                {[
                  [ShieldCheck, "No bank connection"],
                  [Globe, "MAD, EUR or USD"],
                  [ScanLine, "Receipts in any currency"],
                ].map(([Icon, text]) => {
                  const I = Icon as typeof ShieldCheck;
                  return (
                    <li key={text as string} className="flex items-center gap-1.5">
                      <I size={16} className="text-brand" />
                      {t(text as string)}
                    </li>
                  );
                })}
              </ul>
            </div>
            <AppPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t("Features")}</p>
              <h2 className="mt-2 max-w-xl font-display text-3xl font-bold tracking-tight text-ink">{t("Everything you need to master your monthly budget")}</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 110}>
                <div className="group h-full rounded-2xl border border-line bg-background/50 p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-lg hover:shadow-ink/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                    <Icon size={20} className="transition duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  </span>
                  <h3 className="mt-4 font-display font-semibold text-ink">{t(title)}</h3>
                  <p className="mt-1.5 text-sm text-muted">{t(text)}</p>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t("How it works")}</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">{t("Three steps, then it runs by itself")}</h2>
            </Reveal>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 150} className="relative rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5">
                  <span className="font-display text-5xl font-bold text-brand/15">0{i + 1}</span>
                  <h3 className="mt-2 font-display font-semibold text-ink">{t(step.title)}</h3>
                  <p className="mt-1.5 text-sm text-muted">{t(step.text)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* AI */}
        <section id="ai" className="scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-20">
          <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-600 to-violet-600 p-8 text-white sm:p-12">
            <span className="drift pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-white/10" aria-hidden="true" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Sparkles size={13} /> {t("AI monthly report")}
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">{t("Your month, explained in plain words")}</h2>
                <p className="mt-3 text-white/80">
                  {t("We calculate your real numbers first. Then AI explains what changed, which budgets need attention and what to do next month. No invented figures, no financial jargon.")}
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  { icon: TrendingUp, text: "Groceries went down by 36% compared with September." },
                  { icon: BellRing, text: "Your overall budget is 97.6% used with 7 days left." },
                  { icon: Lightbulb, text: "Keep transport under 500 MAD next month to stay on track." },
                ].map(({ icon: Icon, text }, i) => (
                  <Reveal as="li" key={text} delay={250 + i * 150} className="flex items-center gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700">
                      <Icon size={17} />
                    </span>
                    <span className="text-sm">{t(text)}</span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center rounded-3xl border border-line bg-white px-6 py-12 text-center">
            <span className="float flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ShoppingCart size={22} />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t("Start tracking your money today")}</h2>
            <p className="mt-2 max-w-md text-muted">{t("It takes one minute. Your first insights appear as soon as you add a few transactions.")}</p>
            <Link
              href="/register"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              {t("Create my free account")}
              <ArrowRight size={17} />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p className="flex items-center gap-1.5">
            <ChartColumn size={14} /> {t("Personal finance tracking · Not a bank")} · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
