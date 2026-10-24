import {
  Briefcase,
  Bus,
  CircleDollarSign,
  Clapperboard,
  Dumbbell,
  Gift,
  HeartPulse,
  House,
  Laptop,
  LucideIcon,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

// Icon for a category name (default and common custom categories); a coin otherwise
const ICONS: Record<string, LucideIcon> = {
  Groceries: ShoppingCart,
  Transportation: Bus,
  Housing: House,
  Entertainment: Clapperboard,
  Shopping: ShoppingBag,
  Healthcare: HeartPulse,
  Bills: Receipt,
  Restaurants: UtensilsCrossed,
  Gym: Dumbbell,
  Salary: Briefcase,
  Freelance: Laptop,
  Gifts: Gift,
  "Other Income": Wallet,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || CircleDollarSign;
}
