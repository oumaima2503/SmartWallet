import { useId } from "react";

// The assistant's face: the SmartWallet wallet turned into a chat bubble,
// with two eyes on the clasp and a violet AI sparkle (violet = AI everywhere in the app).
export default function AssistantLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`body-${id}`} x1="6" y1="8" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#12b866" />
          <stop offset="1" stopColor="#07683a" />
        </linearGradient>
        <linearGradient id={`spark-${id}`} x1="34" y1="2" x2="46" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* Wallet body with a speech-bubble tail */}
      <path d="M12 11h22a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H18l-7 6v-6.6A8 8 0 0 1 4 31V19a8 8 0 0 1 8-8Z" fill={`url(#body-${id})`} />
      {/* Wallet flap */}
      <path d="M8 16.5a6 6 0 0 1 5-5.4L30 8.3a3 3 0 0 1 3.5 2.7H13a6 6 0 0 0-5 5.5Z" fill="#0a8f4f" opacity=".9" />
      {/* Clasp */}
      <rect x="26" y="19.5" width="16" height="11" rx="5.5" fill="#e6f5ec" />
      {/* Eyes on the clasp */}
      <circle cx="31" cy="25" r="1.7" fill="#0f1f17" />
      <circle cx="37" cy="25" r="1.7" fill="#0f1f17" />
      {/* Smile */}
      <path d="M30.5 33.5c1.9 1.9 5.1 1.9 7 0" stroke="#e6f5ec" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Coin slot detail on the left */}
      <rect x="9" y="22" width="10" height="2.4" rx="1.2" fill="#e6f5ec" opacity=".35" />
      <rect x="9" y="27" width="6" height="2.4" rx="1.2" fill="#e6f5ec" opacity=".25" />
      {/* AI sparkle */}
      <path d="M40 2.5c.6 3 1.9 4.3 5 5-3.1.7-4.4 2-5 5-.6-3-1.9-4.3-5-5 3.1-.7 4.4-2 5-5Z" fill={`url(#spark-${id})`} stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
