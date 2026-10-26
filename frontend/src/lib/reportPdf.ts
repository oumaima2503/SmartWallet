import { formatDate, formatMonth } from "@/lib/format";
import { Report } from "@/types/reports";

// Designed PDF of a saved AI monthly report.
// Calculated numbers and AI text keep separate, labelled parts (like on screen).

type RGB = [number, number, number];

const C = {
  violet: [109, 40, 217] as RGB,
  violetSoft: [245, 243, 255] as RGB,
  violetLine: [221, 214, 254] as RGB,
  green: [10, 143, 79] as RGB,
  greenSoft: [230, 245, 236] as RGB,
  rose: [225, 29, 72] as RGB,
  roseSoft: [255, 241, 242] as RGB,
  amber: [245, 158, 11] as RGB,
  amberSoft: [255, 251, 235] as RGB,
  sky: [2, 132, 199] as RGB,
  skySoft: [240, 249, 255] as RGB,
  ink: [15, 31, 23] as RGB,
  muted: [107, 122, 114] as RGB,
  line: [227, 235, 230] as RGB,
  track: [238, 242, 239] as RGB,
  white: [255, 255, 255] as RGB,
};

// The standard PDF fonts only know Latin-1: replace the special spaces and symbols we use
function clean(text: string) {
  return text
    .replace(/[  ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/≈/g, "~")
    .replace(/▲/g, "+")
    .replace(/▼/g, "-")
    .replace(/[^\x00-\xff]/g, "");
}

// jsPDF is big: it is loaded only when a PDF is downloaded, so the pages open faster
export async function downloadReportPdf(report: Report, money: (amountMad: number) => string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const width = pageWidth - margin * 2;
  const bottom = pageHeight - 20;
  let y = 0;

  const { statistics: s, analysis: a } = report;
  const monthLabel = formatMonth(report.month);

  // ---------- helpers ----------
  const fill = (color: RGB) => doc.setFillColor(...color);
  const textColor = (color: RGB) => doc.setTextColor(...color);
  const font = (size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
  };
  const lineHeight = (size: number) => size * 0.42;

  function newPage() {
    doc.addPage();
    // Thin violet band on following pages
    fill(C.violet);
    doc.rect(0, 0, pageWidth, 6, "F");
    y = 18;
  }

  function ensure(height: number) {
    if (y + height > bottom) newPage();
  }

  // Wrapped text; returns its height without drawing when draw = false
  function text(value: string, x: number, maxWidth: number, size: number, color: RGB, bold = false, draw = true) {
    font(size, bold);
    const lines = doc.splitTextToSize(clean(value), maxWidth) as string[];
    if (draw) {
      textColor(color);
      lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight(size)));
    }
    return lines.length * lineHeight(size);
  }

  function tag(label: string, x: number, color: RGB, background: RGB) {
    font(6.5, true);
    const w = doc.getTextWidth(label) + 5;
    fill(background);
    doc.roundedRect(x, y - 3.2, w, 4.6, 2.3, 2.3, "F");
    textColor(color);
    doc.text(label, x + 2.5, y);
    return w;
  }

  function sectionTitle(number: number, title: string, color: RGB, soft: RGB, label: "CALCULATED" | "AI" | null) {
    ensure(20);
    y += 6;
    fill(soft);
    doc.roundedRect(margin, y - 5, 8, 8, 2, 2, "F");
    font(9, true);
    textColor(color);
    doc.text(String(number), margin + 4, y + 0.6, { align: "center" });
    font(13, true);
    textColor(C.ink);
    doc.text(title, margin + 11, y + 1);
    if (label) {
      font(6.5, true);
      const tagWidth = doc.getTextWidth(label) + 5;
      const x = pageWidth - margin - tagWidth;
      if (label === "AI") tag("AI", x, C.violet, C.violetSoft);
      else tag("CALCULATED", x, C.muted, C.track);
    }
    y += 8;
  }

  // Box with a colored left edge: title, text and "Based on" evidence
  function insightBox(title: string, detail: string, evidence: string, accent: RGB, background: RGB) {
    const inner = width - 10;
    const height = 6 + text(title, 0, inner, 9.5, C.ink, true, false) + text(detail, 0, inner, 9, C.ink, false, false) + (evidence ? text(`Based on: ${evidence}`, 0, inner, 7.5, C.muted, false, false) + 1.5 : 0) + 2;
    ensure(height + 3);
    fill(background);
    doc.roundedRect(margin, y, width, height, 2.5, 2.5, "F");
    fill(accent);
    doc.rect(margin, y, 1.4, height, "F");
    y += 5.5;
    y += text(title, margin + 6, inner, 9.5, C.ink, true);
    y += text(detail, margin + 6, inner, 9, C.ink);
    if (evidence) {
      y += 1.5;
      y += text(`Based on: ${evidence}`, margin + 6, inner, 7.5, C.muted);
    }
    y += 3.5;
  }

  // ---------- cover band ----------
  fill(C.violet);
  doc.rect(0, 0, pageWidth, 58, "F");
  doc.setFillColor(124, 58, 237);
  doc.circle(pageWidth - 18, 6, 34, "F");
  doc.setFillColor(139, 92, 246);
  doc.circle(pageWidth - 52, 64, 22, "F");
  fill(C.violet);
  doc.rect(0, 58, pageWidth, 12, "F");

  font(10, true);
  textColor(C.white);
  doc.text("SmartWallet", margin, 15);
  font(8.5);
  doc.setTextColor(221, 214, 254);
  doc.text("MONTHLY FINANCIAL REPORT", margin, 23);
  font(28, true);
  textColor(C.white);
  doc.text(clean(monthLabel), margin, 37);
  font(8.5);
  doc.setTextColor(221, 214, 254);
  doc.text(clean(`Generated on ${formatDate(report.created_at.slice(0, 10))}  ·  Calculated from your records, explained by AI`), margin, 46);

  // ---------- 4 number cards ----------
  y = 58;
  const cards: { label: string; value: string; color: RGB; soft: RGB }[] = [
    { label: "Income", value: money(s.totals.income), color: C.green, soft: C.greenSoft },
    { label: "Expenses", value: money(s.totals.expenses), color: C.rose, soft: C.roseSoft },
    { label: "Balance", value: money(s.totals.net), color: C.sky, soft: C.skySoft },
    { label: "Saved to goals", value: money(s.totals.saved_to_goals), color: C.violet, soft: C.violetSoft },
  ];
  const cardWidth = (width - 3 * 3) / 4;
  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 3);
    fill(C.white);
    doc.setDrawColor(...C.line);
    doc.roundedRect(x, y, cardWidth, 20, 3, 3, "FD");
    fill(card.color);
    doc.roundedRect(x + 3, y + 3.5, 2, 13, 1, 1, "F");
    font(7.5);
    textColor(C.muted);
    doc.text(card.label, x + 7.5, y + 8);
    font(11, true);
    textColor(card.color);
    doc.text(clean(card.value), x + 7.5, y + 15);
  });
  y += 28;

  // ---------- AI summary ----------
  {
    const inner = width - 10;
    const height = text(a.overview, 0, inner, 10, C.ink, false, false) + 13;
    fill(C.violetSoft);
    doc.setDrawColor(...C.violetLine);
    doc.roundedRect(margin, y, width, height, 3, 3, "FD");
    y += 7;
    tag("AI SUMMARY", margin + 5, C.violet, C.white);
    y += 5.5;
    y += text(a.overview, margin + 5, inner, 10, C.ink);
    y += 6;
  }

  if (a.history_note) {
    y += 1;
    y += text(`Note: ${a.history_note}`, margin, width, 8, C.muted);
    y += 1;
  }

  // ---------- 1. Spending (bar chart) ----------
  sectionTitle(1, "Where your money went", C.amber, C.amberSoft, "CALCULATED");
  const spent = s.categories.filter((c) => c.total > 0);
  const biggest = Math.max(...spent.map((c) => c.total), 1);
  const labelWidth = 38;
  const valueWidth = 46;
  const barWidth = width - labelWidth - valueWidth;
  for (const c of spent) {
    ensure(8);
    font(8.5);
    textColor(C.ink);
    doc.text(clean(c.category).slice(0, 22), margin, y + 1);
    fill(C.track);
    doc.roundedRect(margin + labelWidth, y - 2.2, barWidth, 3.6, 1.8, 1.8, "F");
    fill(C.amber);
    doc.roundedRect(margin + labelWidth, y - 2.2, Math.max((c.total / biggest) * barWidth, 2), 3.6, 1.8, 1.8, "F");
    font(8.5, true);
    textColor(C.ink);
    doc.text(clean(money(c.total)), pageWidth - margin - 18, y + 1, { align: "right" });
    font(7.5);
    const change =
      c.previous_month_total === 0 ? "new" : c.change_percent === null ? `${c.percent_of_expenses}%` : `${c.change_percent > 0 ? "+" : ""}${c.change_percent}%`;
    textColor(c.change_percent !== null && c.change_percent > 0 ? C.rose : c.change_percent !== null && c.change_percent < 0 ? C.green : C.muted);
    doc.text(change, pageWidth - margin, y + 1, { align: "right" });
    y += 7;
  }
  y += 2;
  for (const item of a.spending_patterns) insightBox(item.title, item.detail, item.evidence, C.amber, C.amberSoft);

  // ---------- 2. Budgets ----------
  sectionTitle(2, "Budgets", C.rose, C.roseSoft, "CALCULATED");
  const budgets = [...(s.budgets.overall ? [s.budgets.overall] : []), ...s.budgets.categories];
  if (budgets.length === 0) {
    y += text("No budget was set for this month.", margin, width, 9, C.muted);
    y += 2;
  }
  for (const b of budgets) {
    ensure(11);
    const color = b.status === "exceeded" ? C.rose : b.status === "warning" ? C.amber : C.green;
    font(9, true);
    textColor(C.ink);
    doc.text(clean(b.is_overall ? "Overall budget" : b.category), margin, y);
    font(8);
    textColor(color);
    doc.text(clean(`${Math.round(b.percent_used)}%  ·  ${money(b.spent)} of ${money(b.limit)}`), pageWidth - margin, y, { align: "right" });
    fill(C.track);
    doc.roundedRect(margin, y + 2, width, 3, 1.5, 1.5, "F");
    fill(color);
    doc.roundedRect(margin, y + 2, Math.max((Math.min(b.percent_used, 100) / 100) * width, 2), 3, 1.5, 1.5, "F");
    y += 10;
  }
  for (const concern of a.budget_concerns) {
    insightBox(concern.category === "Overall" ? "Overall budget" : concern.category, concern.detail, concern.evidence, C.rose, C.roseSoft);
  }

  // ---------- 3. Positive observations ----------
  sectionTitle(3, "What went well", C.green, C.greenSoft, "AI");
  if (a.positive_observations.length === 0) {
    y += text("Nothing stood out this month.", margin, width, 9, C.muted);
    y += 2;
  }
  for (const item of a.positive_observations) insightBox(item.title, item.detail, item.evidence, C.green, C.greenSoft);

  // ---------- 4. Recommendations ----------
  sectionTitle(4, "Recommendations for next month", C.violet, C.violetSoft, "AI");
  a.recommendations.forEach((rec, i) => {
    const inner = width - 16;
    const height =
      text(rec.action, 0, inner, 10, C.ink, true, false) + text(rec.reason, 0, inner, 9, C.ink, false, false) + text(`Based on: ${rec.evidence}`, 0, inner, 7.5, C.muted, false, false) + 10;
    ensure(height + 3);
    doc.setDrawColor(...C.violetLine);
    fill(C.white);
    doc.roundedRect(margin, y, width, height, 3, 3, "FD");
    fill(C.violet);
    doc.circle(margin + 6.5, y + 7, 3.6, "F");
    font(9, true);
    textColor(C.white);
    doc.text(String(i + 1), margin + 6.5, y + 8.2, { align: "center" });
    y += 6.5;
    y += text(rec.action, margin + 13, inner, 10, C.ink, true);
    y += text(rec.reason, margin + 13, inner, 9, C.ink);
    y += 1.2;
    y += text(`Based on: ${rec.evidence}`, margin + 13, inner, 7.5, C.muted);
    y += 5;
  });

  // ---------- disclaimer ----------
  ensure(14);
  y += 3;
  text(
    "Numbers are calculated from your recorded transactions, budgets and savings; the AI only explains them. " +
      "Suggestions are general budgeting tips, not professional financial advice. Amounts in the AI text are in MAD.",
    margin,
    width,
    7.5,
    C.muted
  );

  // ---------- footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...C.line);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    font(7.5);
    textColor(C.muted);
    doc.text(clean(`SmartWallet  ·  ${monthLabel} report`), margin, pageHeight - 7);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  doc.save(`smartwallet-report-${report.month}.pdf`);
}
