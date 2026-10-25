// Amounts are formatted by useCurrency() (lib/currency.tsx); this file only formats dates.
import { currentLanguage } from "./i18n";

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  // Month names used in Morocco
  ar: ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"],
};
const SHORT_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function monthName(index: number, short = false) {
  const language = currentLanguage();
  if (!short) return MONTH_NAMES[language][index];
  if (language === "fr") return SHORT_FR[index];
  if (language === "ar") return MONTH_NAMES.ar[index];
  return MONTH_NAMES.en[index].slice(0, 3);
}

// "2026-10-07" -> "7 Oct 2026" (written by hand so every browser shows the same text)
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${monthName(month - 1, true)} ${year}`;
}

// "2026-10" -> "October 2026" (or "Oct" with short = true)
export function formatMonth(month: string, short = false): string {
  const [year, m] = month.split("-").map(Number);
  const name = monthName(m - 1, short);
  return short ? name : `${currentLanguage() === "fr" ? name[0].toUpperCase() + name.slice(1) : name} ${year}`;
}

// 0 -> "Jan" / "janv." / "يناير"
export function shortMonthName(index: number): string {
  return monthName(index, true);
}

export function currentMonthString(): string {
  return todayString().slice(0, 7);
}

export function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
