import {
  Car,
  GraduationCap,
  Heart,
  House,
  Laptop,
  LucideIcon,
  PiggyBank,
  Plane,
  ShieldCheck,
  Smartphone,
  Gift,
} from "lucide-react";

// Each goal gets an icon guessed from its name and a color, so goals are easy to tell apart

const ICONS: [RegExp, LucideIcon][] = [
  [/laptop|computer|ordinateur|pc|macbook/i, Laptop],
  [/phone|iphone|t[ée]l[ée]phone|mobile/i, Smartphone],
  [/car|voiture|moto/i, Car],
  [/trip|travel|vacation|holiday|voyage|vacances|flight/i, Plane],
  [/house|home|apartment|appartement|maison|rent/i, House],
  [/emergency|urgence|safety|security/i, ShieldCheck],
  [/school|study|studies|education|course|[ée]tudes|university/i, GraduationCap],
  [/wedding|mariage|love/i, Heart],
  [/gift|cadeau|birthday|anniversaire/i, Gift],
];

export const THEMES = [
  { name: "emerald", color: "#0a8f4f", soft: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", ring: "ring-emerald-100" },
  { name: "sky", color: "#0284c7", soft: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-500", ring: "ring-sky-100" },
  { name: "violet", color: "#7c3aed", soft: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-500", ring: "ring-violet-100" },
  { name: "amber", color: "#d97706", soft: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500", ring: "ring-amber-100" },
  { name: "rose", color: "#e11d48", soft: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500", ring: "ring-rose-100" },
];

export function goalIcon(name: string): LucideIcon {
  return ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? PiggyBank;
}

export function goalTheme(id: number) {
  return THEMES[id % THEMES.length];
}
