// Small hand-made illustrations for empty pages (inline SVG, brand colors, no external files)

export type IllustrationName = "wallet" | "receipt" | "chart" | "goal" | "budget";

const GREEN = "#0a8f4f";
const GREEN_SOFT = "#e6f5ec";
const GREEN_MID = "#7cc9a0";
const INK = "#0f1f17";
const AMBER = "#f59e0b";
const VIOLET = "#7c3aed";

function Scene({ name }: { name: IllustrationName }) {
  switch (name) {
    case "wallet":
      return (
        <>
          <rect x="34" y="46" width="92" height="62" rx="12" fill={GREEN} />
          <rect x="34" y="46" width="92" height="18" rx="9" fill="#07683a" />
          <rect x="96" y="68" width="34" height="22" rx="7" fill={GREEN_SOFT} />
          <circle cx="108" cy="79" r="4" fill={GREEN} />
          <circle cx="50" cy="34" r="10" fill={AMBER} />
          <text x="50" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">$</text>
          <circle cx="72" cy="24" r="8" fill="#fbbf24" />
          <path d="M44 120h72" stroke={GREEN_MID} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "receipt":
      return (
        <>
          <path d="M50 22h60v92l-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6-7.5-6-7.5 6z" fill="#fff" stroke={INK} strokeOpacity=".12" strokeWidth="2" />
          <rect x="60" y="36" width="40" height="6" rx="3" fill={GREEN} />
          <rect x="60" y="52" width="28" height="4" rx="2" fill={INK} opacity=".15" />
          <rect x="60" y="62" width="34" height="4" rx="2" fill={INK} opacity=".15" />
          <rect x="60" y="72" width="22" height="4" rx="2" fill={INK} opacity=".15" />
          <rect x="60" y="88" width="40" height="6" rx="3" fill={INK} opacity=".7" />
          <rect x="30" y="64" width="100" height="3" rx="1.5" fill={GREEN} opacity=".8" />
          <circle cx="122" cy="34" r="12" fill={GREEN} />
          <path d="m116 34 4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "chart":
      return (
        <>
          <rect x="30" y="28" width="100" height="80" rx="12" fill="#fff" stroke={INK} strokeOpacity=".1" strokeWidth="2" />
          <rect x="44" y="76" width="12" height="20" rx="3" fill={GREEN_MID} />
          <rect x="62" y="64" width="12" height="32" rx="3" fill={GREEN_MID} />
          <rect x="80" y="54" width="12" height="42" rx="3" fill={GREEN} />
          <rect x="98" y="44" width="12" height="52" rx="3" fill={INK} />
          <circle cx="126" cy="30" r="12" fill={VIOLET} />
          <path d="M126 23v14M119 30h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "goal":
      return (
        <>
          <circle cx="80" cy="70" r="40" fill="#fff" stroke={GREEN_MID} strokeWidth="8" />
          <circle cx="80" cy="70" r="24" fill="#fff" stroke={GREEN} strokeWidth="8" />
          <circle cx="80" cy="70" r="8" fill={INK} />
          <path d="M80 70 120 30" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="m112 28 10 0 0 10" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="30" r="5" fill={AMBER} />
          <circle cx="128" cy="104" r="4" fill={VIOLET} />
        </>
      );
    case "budget":
      return (
        <>
          <rect x="30" y="40" width="100" height="66" rx="10" fill="#fff" stroke={INK} strokeOpacity=".1" strokeWidth="2" />
          <path d="m30 50 50 30 50-30" stroke={GREEN} strokeWidth="4" fill="none" strokeLinejoin="round" />
          <rect x="44" y="92" width="72" height="6" rx="3" fill={GREEN_SOFT} />
          <rect x="44" y="92" width="50" height="6" rx="3" fill={GREEN} />
          <rect x="91" y="88" width="2" height="14" rx="1" fill={INK} opacity=".4" />
          <circle cx="116" cy="34" r="12" fill={AMBER} />
          <text x="116" y="38.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">!</text>
        </>
      );
  }
}

export default function Illustration({ name, className = "h-32 w-40" }: { name: IllustrationName; className?: string }) {
  return (
    <svg viewBox="0 0 160 130" className={className} aria-hidden="true">
      <ellipse cx="80" cy="122" rx="56" ry="6" fill={INK} opacity=".06" />
      <circle cx="80" cy="68" r="58" fill={GREEN_SOFT} opacity=".7" />
      <Scene name={name} />
    </svg>
  );
}
