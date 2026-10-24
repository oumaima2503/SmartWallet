import { ChartColumn, PiggyBank, ScanLine, Wallet } from "lucide-react";

const FEATURES = [
  { icon: ScanLine, text: "Snap a receipt, we fill in the expense" },
  { icon: PiggyBank, text: "Budgets and savings goals that keep you on track" },
  { icon: ChartColumn, text: "AI monthly reports based on your real numbers" },
];

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

// Split screen: brand panel on the left (desktop), form on the right
export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-brand-dark via-[#0b7d45] to-brand p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Wallet size={20} />
          </span>
          <span className="text-xl font-bold tracking-tight">SmartWallet</span>
        </div>

        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Smarter money for a better tomorrow.</h2>
          <p className="mt-3 text-white/80">Track your spending, plan your budgets and reach your savings goals.</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon size={18} />
                </span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">Personal finance tracking. No bank connection needed.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white">
              <Wallet size={20} />
            </span>
            <span className="text-xl font-bold tracking-tight text-ink">SmartWallet</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}
