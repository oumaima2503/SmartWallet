type Tone = "green" | "dark" | "violet";

// The tone tells what the card is about: green = money, dark = limits / budgets, violet = AI
const TONES: Record<Tone, string> = {
  green: "from-brand-dark via-[#0b7d45] to-brand shadow-brand/20",
  dark: "from-[#0f1f17] via-[#14382a] to-brand-dark shadow-black/15",
  violet: "from-violet-700 via-indigo-600 to-violet-600 shadow-violet-600/20",
};

type Props = {
  tone?: Tone;
  // Less padding, for slim summary rows
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
};

// Same shape for the top card of every page (radius, padding, shadow, decorative circles)
export default function Hero({ tone = "green", compact = false, className = "", children }: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg ${TONES[tone]} ${
        compact ? "px-4 py-3" : "p-5"
      } ${className}`}
    >
      <span className="pointer-events-none absolute -end-12 -top-16 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-20 start-1/3 h-36 w-36 rounded-full bg-white/5" aria-hidden="true" />
      <div className="relative">{children}</div>
    </section>
  );
}
