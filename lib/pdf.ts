import { formatDay, MOOD_LABELS, SUPPORT_LABELS, type Report } from "./report";

// Colours (RGB) matching the light theme.
const INK: [number, number, number] = [59, 51, 80];
const MUTED: [number, number, number] = [98, 90, 119];
const BRAND: [number, number, number] = [100, 80, 176];
const SOFT: [number, number, number] = [239, 235, 250];
const LINE: [number, number, number] = [220, 213, 235];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PT_TO_MM = 0.3528;

const REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u2032]/g, "\u0027"],
  [/[\u201C\u201D\u201E\u2033]/g, "\u0022"],
  [/[–—−]/g, "-"],
  [/…/g, "..."],
  [/[•·●]/g, "-"],
  [/→/g, "->"],
  [/≤/g, "<="],
  [/≥/g, ">="],
];

/**
 * The PDF built-in font can only draw Latin text. Normalise common punctuation, and replace anything it
 * cannot draw with a question mark so the document is never garbled; `lossy` tells the caller to warn her.
 */
export function pdfText(input: string): { text: string; lossy: boolean } {
  let text = input;
  for (const [re, to] of REPLACEMENTS) text = text.replace(re, to);
  let lossy = false;
  text = text.replace(/[^ -~ -ÿ\n]/gu, () => {
    lossy = true;
    return "?";
  });
  return { text, lossy };
}

export function needsLatinWarning(texts: string[]): boolean {
  return texts.some((t) => pdfText(t).lossy);
}

export async function buildPdf(report: Report): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const t = (s: string) => pdfText(s).text;
  let y = MARGIN;

  const setFont = (size: number, style: "normal" | "bold" | "italic" = "normal", color = INK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lineH = (size: number) => size * PT_TO_MM * 1.4;
  const ensure = (h: number) => {
    if (y + h > PAGE_H - 22) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text: string) => {
    ensure(16);
    y += 5;
    setFont(13, "bold", BRAND);
    doc.text(t(text), MARGIN, y);
    y += 2;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  const paragraph = (text: string, size = 10, style: "normal" | "bold" | "italic" = "normal", color = INK, indent = 0) => {
    setFont(size, style, color);
    const lines: string[] = doc.splitTextToSize(t(text), CONTENT_W - indent);
    for (const line of lines) {
      ensure(lineH(size));
      doc.text(line, MARGIN + indent, y);
      y += lineH(size);
    }
  };

  const bullets = (items: string[], numbered = false) => {
    items.forEach((item, i) => {
      setFont(10);
      const marker = numbered ? `${i + 1}.` : "-";
      const lines: string[] = doc.splitTextToSize(t(item), CONTENT_W - 8);
      ensure(lineH(10) * Math.min(lines.length, 2));
      doc.text(marker, MARGIN + 1, y);
      for (const line of lines) {
        ensure(lineH(10));
        doc.text(line, MARGIN + 8, y);
        y += lineH(10);
      }
      y += 1;
    });
  };

  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const rowH = 7;
    ensure(rowH * 2);
    doc.setFillColor(...SOFT);
    doc.rect(MARGIN, y - 4.8, CONTENT_W, rowH, "F");
    setFont(9, "bold", BRAND);
    let x = MARGIN + 2;
    headers.forEach((h, i) => {
      doc.text(t(h), x, y);
      x += widths[i];
    });
    y += rowH;
    rows.forEach((row) => {
      ensure(rowH);
      setFont(9.5);
      let cx = MARGIN + 2;
      row.forEach((cell, i) => {
        doc.text(t(cell), cx, y);
        cx += widths[i];
      });
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
      y += rowH;
    });
    y += 2;
  };

  // ---------------------------------------------------------------- title block
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE_W, 34, "F");
  setFont(22, "bold", [255, 255, 255]);
  doc.text("Weekly wellbeing summary", MARGIN, 17);
  setFont(10.5, "normal", [235, 230, 250]);
  doc.text(t(`${formatDay(report.rangeStart)} to ${formatDay(report.rangeEnd)}  |  Prepared with Bloom`), MARGIN, 25);
  y = 44;

  paragraph(
    "Self-reported by the person named below, to help us talk about how the past week has been. Some notes were picked out of her conversations with Bloom, an AI companion, so please treat them as a starting point for discussion, not as clinical findings.",
    9.5,
    "italic",
    MUTED,
  );
  y += 2;

  // ---------------------------------------------------------------- about
  if (report.about.length) {
    heading("About");
    const colW = CONTENT_W / 2;
    report.about.forEach((a, i) => {
      const col = i % 2;
      if (col === 0) ensure(7);
      setFont(9.5, "bold", MUTED);
      doc.text(t(a.label), MARGIN + col * colW, y);
      setFont(10.5, "normal", INK);
      doc.text(t(a.value), MARGIN + col * colW + 30, y);
      if (col === 1 || i === report.about.length - 1) y += 6.5;
    });
  }

  // ---------------------------------------------------------------- at a glance
  heading("At a glance");
  const tiles: { label: string; value: string }[] = [
    { label: "Average mood", value: report.avgMood === null ? "-" : `${report.avgMood}/5 (${MOOD_LABELS[Math.round(report.avgMood) - 1] ?? ""})` },
    { label: "Sleep per day", value: report.sleep.avgHours === null ? "-" : `${report.sleep.avgHours} h` },
    { label: "Longest stretch", value: report.sleep.avgLongest === null ? "-" : `${report.sleep.avgLongest} h` },
    { label: "Night wakings", value: report.sleep.avgWakeups === null ? "-" : `${report.sleep.avgWakeups}` },
  ];
  const tileW = (CONTENT_W - 9) / 4;
  ensure(24);
  tiles.forEach((tile, i) => {
    const x = MARGIN + i * (tileW + 3);
    doc.setFillColor(...SOFT);
    doc.roundedRect(x, y, tileW, 19, 3, 3, "F");
    setFont(8.5, "normal", MUTED);
    doc.text(t(tile.label), x + 3, y + 6);
    setFont(12, "bold", INK);
    const lines: string[] = doc.splitTextToSize(t(tile.value), tileW - 5);
    doc.text(lines[0] ?? "-", x + 3, y + 14);
  });
  y += 24;
  if (report.avgSupport !== null) {
    paragraph(`Average support at home: ${report.avgSupport}/5 (${SUPPORT_LABELS[Math.round(report.avgSupport) - 1] ?? ""})`, 10, "normal", MUTED);
  }

  // ---------------------------------------------------------------- safety flag
  const flagged = report.epds.inRange.find((e) => e.selfHarm) ?? (report.epds.latest?.selfHarm ? report.epds.latest : undefined);
  if (flagged) {
    y += 3;
    ensure(22);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.8);
    doc.setFillColor(...SOFT);
    doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");
    setFont(10.5, "bold", INK);
    doc.text("Please ask about this directly", MARGIN + 4, y + 7);
    setFont(9.5, "normal", INK);
    const lines: string[] = doc.splitTextToSize(
      t(`On ${formatDay(flagged.date)} the screening answer showed that thoughts of self-harm have occurred (EPDS item 10).`),
      CONTENT_W - 8,
    );
    doc.text(lines, MARGIN + 4, y + 12.5);
    y += 22;
  }

  // ---------------------------------------------------------------- screening
  heading("Postnatal depression screening (EPDS)");
  if (report.epds.inRange.length) {
    table(
      ["Date", "Score (0-30)", "Result"],
      report.epds.inRange.map((e) => [formatDay(e.date, true), `${e.total}`, e.label]),
      [38, 34, CONTENT_W - 72],
    );
  } else if (report.epds.latest) {
    paragraph(
      `No screening this week. Most recent: ${report.epds.latest.total}/30 on ${formatDay(report.epds.latest.date)} (${report.epds.latest.label}).`,
    );
  } else {
    paragraph("No screening completed yet.");
  }
  paragraph(
    "The EPDS is a screening questionnaire, not a diagnosis. A score of 13 or more suggests depression is likely and is a reason to talk to a health professional.",
    8.5,
    "italic",
    MUTED,
  );

  // ---------------------------------------------------------------- daily table
  heading("Day by day");
  table(
    ["Day", "Mood", "Sleep", "Longest", "Wakings", "Support"],
    report.rows.map((r) => [
      formatDay(r.date, true),
      r.mood ? MOOD_LABELS[r.mood - 1] : "-",
      r.sleep !== undefined ? `${r.sleep} h` : "-",
      r.longest !== undefined ? `${r.longest} h` : "-",
      r.wakeups !== undefined ? `${r.wakeups}` : "-",
      r.support ? SUPPORT_LABELS[r.support - 1] : "-",
    ]),
    [26, 30, 24, 26, 24, CONTENT_W - 130],
  );

  // ---------------------------------------------------------------- conversations
  heading("Things I have mentioned this week");
  if (report.points.length) {
    bullets(report.points.map((n) => (n.source === "me" ? `${n.text} (my note)` : n.text)));
  } else {
    paragraph("Nothing recorded this week.", 10, "italic", MUTED);
  }
  if (report.themes.length) {
    y += 1;
    paragraph(`Recurring themes in conversations: ${report.themes.join(", ")}.`, 9.5, "normal", MUTED);
  }
  if (report.checkinNotes.length) {
    y += 2;
    paragraph("Notes from my check-ins", 10, "bold");
    bullets(report.checkinNotes.map((n) => `${formatDay(n.date, true)}: ${n.text}`));
  }

  // ---------------------------------------------------------------- questions
  heading("Questions I would like to ask");
  if (report.questions.length) bullets(report.questions.map((n) => n.text), true);
  else paragraph("None noted.", 10, "italic", MUTED);

  // ---------------------------------------------------------------- baby
  if (report.baby.daysLogged > 0) {
    heading("Baby");
    paragraph(
      `Logged on ${report.baby.daysLogged} of 7 days. Average per logged day: ${report.baby.avgFeeds ?? "-"} feeds, ${report.baby.avgNappies ?? "-"} nappies.`,
    );
  }

  // ---------------------------------------------------------------- footers on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
    setFont(8, "normal", MUTED);
    const generated = new Date(report.endTs).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.text(
      t(`Generated by Bloom on ${generated}. Self-reported information; Bloom is an AI companion and cannot diagnose. In an emergency call ${report.emergency}.`),
      MARGIN,
      PAGE_H - 11,
      { maxWidth: CONTENT_W - 18 },
    );
    doc.text(`${i} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 11, { align: "right" });
  }

  const d = new Date(report.endTs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `bloom-weekly-summary-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
  return { blob: doc.output("blob"), filename };
}

/** Trigger a normal browser download of the blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
