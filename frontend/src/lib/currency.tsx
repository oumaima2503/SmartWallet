"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

// Every amount is stored in MAD. The chosen currency only changes how amounts are shown and typed:
// shown amounts are converted from MAD, typed amounts are converted back to MAD before saving.

export const CURRENCIES = {
  MAD: { symbol: "MAD", name: "Moroccan dirham" },
  EUR: { symbol: "€", name: "Euro" },
  USD: { symbol: "$", name: "US dollar" },
} as const;

export type Currency = keyof typeof CURRENCIES;

type Rates = { rates: Record<Currency, number>; updated_at: string; source: "live" | "fallback" };

type CurrencyContext = {
  currency: Currency;
  symbol: string;
  rates: Rates | null;
  setCurrency: (currency: Currency) => Promise<void>;
  // MAD -> chosen currency, as a number
  convert: (amountMad: number) => number;
  // Chosen currency -> MAD, for values typed by the user
  toBase: (amount: number) => number;
  // MAD -> "1 234,5 €" (compact: "1,2k €")
  money: (amountMad: number, options?: { compact?: boolean }) => string;
};

const Context = createContext<CurrencyContext | null>(null);
const STORAGE_KEY = "smartwallet.currency";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function readStoredCurrency(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in CURRENCIES) return stored as Currency;
  } catch {
    // Storage can be blocked; MAD is fine
  }
  return "MAD";
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("MAD");
  const [rates, setRates] = useState<Rates | null>(null);

  useEffect(() => {
    // Last choice from this browser first (no flash), then the saved profile value
    setCurrencyState(readStoredCurrency());
    api<{ currency: string }>("/api/users/me")
      .then((user) => user.currency in CURRENCIES && setCurrencyState(user.currency as Currency))
      .catch(() => {});
    api<Rates>("/api/currency/rates")
      .then(setRates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // ignore
    }
  }, [currency]);

  const setCurrency = useCallback(
    async (next: Currency) => {
      const previous = currency;
      setCurrencyState(next);
      try {
        await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ currency: next }) });
      } catch (error) {
        setCurrencyState(previous);
        throw error;
      }
    },
    [currency]
  );

  const value = useMemo<CurrencyContext>(() => {
    // Until the rates are loaded, only MAD can be shown correctly
    const rate = rates?.rates[currency] ?? (currency === "MAD" ? 1 : null);
    const symbol = rate === null ? "MAD" : CURRENCIES[currency].symbol;
    const convert = (amountMad: number) => (rate === null ? amountMad : amountMad * rate);
    const toBase = (amount: number) => (rate === null || rate === 0 ? amount : round2(amount / rate));

    const money = (amountMad: number, options?: { compact?: boolean }) => {
      const amount = convert(amountMad);
      const text = options?.compact
        ? new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(amount)
        : amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return `${text} ${symbol}`;
    };

    return { currency, symbol, rates, setCurrency, convert, toBase, money };
  }, [currency, rates, setCurrency]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCurrency() {
  const context = useContext(Context);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider");
  return context;
}
