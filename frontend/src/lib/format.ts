// TODO: use the user's preferred currency once the profile API exists
export const CURRENCY = "MAD";

export function formatMoney(amount: number, currency = CURRENCY): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026-10-07" -> "7 Oct 2026" (written by hand so every browser shows the same text)
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`;
}

// "2026-10" -> "October 2026" (or "Oct" with short = true)
export function formatMonth(month: string, short = false): string {
  const [year, m] = month.split("-").map(Number);
  return short ? MONTHS[m - 1].slice(0, 3) : `${MONTHS[m - 1]} ${year}`;
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
