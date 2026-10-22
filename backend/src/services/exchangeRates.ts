// Exchange rates from MAD (the currency every amount is stored in) to the display currencies.
// Free API without key, cached so it is called at most every few hours.

export const BASE_CURRENCY = "MAD";
export const SUPPORTED_CURRENCIES = ["MAD", "EUR", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const RATES_URL = "https://open.er-api.com/v6/latest/MAD";
const CACHE_MS = 6 * 60 * 60 * 1000;

// Used only if the API can't be reached (approximate values)
const FALLBACK_RATES: Record<Currency, number> = { MAD: 1, EUR: 0.092, USD: 0.1 };

type Rates = {
  base: string;
  rates: Record<Currency, number>;
  updated_at: string;
  source: "live" | "fallback";
};

let cache: { value: Rates; fetchedAt: number } | null = null;

export async function getRates(): Promise<Rates> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.value;

  try {
    const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    if (data.result !== "success") throw new Error("Rates API error");

    const value: Rates = {
      base: BASE_CURRENCY,
      rates: { MAD: 1, EUR: data.rates.EUR, USD: data.rates.USD },
      updated_at: new Date(data.time_last_update_unix * 1000).toISOString(),
      source: "live",
    };
    cache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    // Keep the last good rates if we have them, otherwise the approximate ones
    if (cache) return cache.value;
    return { base: BASE_CURRENCY, rates: FALLBACK_RATES, updated_at: new Date().toISOString(), source: "fallback" };
  }
}

export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
