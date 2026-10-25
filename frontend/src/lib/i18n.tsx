"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useState } from "react";
import { ar, fr } from "./translations";
import { APP_TEXT } from "./translationsApp";

export type Language = "en" | "fr" | "ar";

export const LANGUAGES: Record<Language, { label: string; short: string; locale: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", short: "EN", locale: "en-GB", dir: "ltr" },
  fr: { label: "Français", short: "FR", locale: "fr-FR", dir: "ltr" },
  ar: { label: "العربية", short: "ع", locale: "ar-MA", dir: "rtl" },
};

const appText = (index: 0 | 1) => Object.fromEntries(Object.entries(APP_TEXT).map(([english, pair]) => [english, pair[index]]));
const DICTIONARIES = { en: {}, fr: { ...appText(0), ...fr }, ar: { ...appText(1), ...ar } } as Record<Language, Record<string, string>>;
const STORAGE_KEY = "smartwallet.language";

type Values = Record<string, string | number>;

// Language used by t() outside React hooks (helpers like formatMonth). Set by the provider.
let current: Language = "en";

export function currentLanguage() {
  return current;
}

// t("Dashboard") or t("{amount} left", { amount: "50 MAD" })
export function t(text: string, values?: Values) {
  let result = DICTIONARIES[current][text] ?? text;
  if (values) for (const [key, value] of Object.entries(values)) result = result.replaceAll(`{${key}}`, String(value));
  return result;
}

type LanguageContext = {
  language: Language;
  setLanguage: (language: Language) => void;
  // t("Dashboard") or t("{amount} left", { amount: "50 MAD" })
  t: (text: string, values?: Values) => string;
  locale: string;
};

const Context = createContext<LanguageContext | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Saved choice first, then the browser language
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const browser = navigator.language.slice(0, 2);
    const initial = saved ?? browser;
    if (initial in LANGUAGES) setLanguageState(initial as Language);
  }, []);

  // Arabic is written right to left: the whole layout flips
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = LANGUAGES[language].dir;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  current = language;
  const translate = useCallback((text: string, values?: Values) => t(text, values), [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // key={language}: the whole app re-renders in the new language (pages reload their data)
  return (
    <Context.Provider value={{ language, setLanguage, t: translate, locale: LANGUAGES[language].locale }}>
      <Fragment key={language}>{children}</Fragment>
    </Context.Provider>
  );
}

export function useT() {
  const context = useContext(Context);
  if (!context) throw new Error("useT must be used inside LanguageProvider");
  return context;
}
