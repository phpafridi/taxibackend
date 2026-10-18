// lib/letterhead.ts
// Turns typed text into letters on the company letterhead. The header and footer are DRAWN from the contact details
// the admin keeps in the app (no uploaded picture). The SAME layout is used for the in-app preview and for the PDF,
// so what you see is what you download.
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export const PAGE_W = 595.28; // A4 in points
export const PAGE_H = 841.89;
const CM = 28.3465;

export type FontKey = "helvetica" | "times";
export type Margins = { top: number; bottom: number; left: number; right: number }; // centimetres
export type LetterSettings = { margins: Margins; font: FontKey; fontSize: number };

export const DEFAULT_SETTINGS: LetterSettings = {
  margins: { top: 4.2, bottom: 3, left: 2.2, right: 2.2 },
  font: "helvetica",
  fontSize: 11,
};

export const MAX_TEXT = 20000;
export const MAX_PAGES = 30;

const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
};

/** Accepts anything (stored JSON, request body) and returns safe, complete settings. */
export function normaliseSettings(raw: unknown, base: LetterSettings = DEFAULT_SETTINGS): LetterSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m = (r.margins && typeof r.margins === "object" ? r.margins : {}) as Record<string, unknown>;
  const margins: Margins = {
    top: clamp(m.top, 0, 15, base.margins.top),
    bottom: clamp(m.bottom, 0, 12, base.margins.bottom),
    left: clamp(m.left, 0.5, 6, base.margins.left),
    right: clamp(m.right, 0.5, 6, base.margins.right),
  };
  // always leave at least 8 cm of writing width
  const maxSides = (PAGE_W / CM - 8) / 2;
  margins.left = Math.min(margins.left, maxSides);
  margins.right = Math.min(margins.right, maxSides);
  return {
    margins,
    font: r.font === "times" ? "times" : r.font === "helvetica" ? "helvetica" : base.font,
    fontSize: Math.round(clamp(r.fontSize, 9, 16, base.fontSize) * 2) / 2,
  };
}

export type LetterProfile = {
  companyName: string; tagline: string; address: string; phone: string; email: string; website: string; companyNumber: string; footerNote: string;
};
export const DEFAULT_PROFILE: LetterProfile = {
  companyName: "RS Private Hire", tagline: "", address: "", phone: "", email: "", website: "rsphire.co.uk", companyNumber: "", footerNote: "",
};
const PROFILE_MAX: Record<keyof LetterProfile, number> = {
  companyName: 60, tagline: 100, address: 200, phone: 40, email: 80, website: 80, companyNumber: 40, footerNote: 140,
};

/** Accepts anything and returns a safe, complete profile (trimmed, length-limited). Address may keep line breaks. */
export function normaliseProfile(raw: unknown, base: LetterProfile = DEFAULT_PROFILE): LetterProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...base };
  for (const k of Object.keys(PROFILE_MAX) as (keyof LetterProfile)[]) {
    if (typeof r[k] === "string") {
      const v = (r[k] as string).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/g, "");
      out[k] = (k === "address" ? v.split("\n").map((x) => x.trim()).filter(Boolean).join("\n") : v.replace(/\n/g, " ").trim()).slice(0, PROFILE_MAX[k]);
    }
  }
  if (!out.companyName) out.companyName = base.companyName || DEFAULT_PROFILE.companyName;
  return out;
}

// Page furniture, in points
const HEADER_H = 78;
const ACCENT_H = 4;
export type LetterFrame = { headerH: number; accentH: number; name: string; tagline: string; footer: string[] };

export type LetterLine = { t: string; y: number }; // y = text baseline, in points from the TOP of the page
export type LetterLayout = {
  page: { w: number; h: number };
  left: number; // points
  size: number;
  lineHeight: number;
  font: FontKey;
  frame: LetterFrame;
  pages: { lines: LetterLine[] }[];
  replaced: number; // characters the PDF font cannot print (emoji, other alphabets) that were swapped for "?"
};

const STD: Record<FontKey, StandardFonts> = { helvetica: StandardFonts.Helvetica, times: StandardFonts.TimesRoman };

function cleanText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200f\u2028\u2029\ufeff]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "");
}

/** Replaces any character the standard PDF font cannot encode with "?" (and counts them). */
function toPrintable(text: string, font: PDFFont): { text: string; replaced: number } {
  const ok = new Map<string, boolean>();
  let replaced = 0;
  let out = "";
  for (const ch of text) {
    if (ch === "\n") { out += ch; continue; }
    let fine = ok.get(ch);
    if (fine === undefined) {
      try { font.widthOfTextAtSize(ch, 10); fine = true; } catch { fine = false; }
      ok.set(ch, fine);
    }
    if (fine) out += ch; else { out += "?"; replaced++; }
  }
  return { text: out, replaced };
}

function wrapParagraph(font: PDFFont, size: number, maxW: number, para: string): string[] {
  if (para.trim() === "") return [""];
  const lines: string[] = [];
  let cur = "";
  for (const word of para.split(" ")) {
    const test = cur === "" ? word : `${cur} ${word}`;
    if (font.widthOfTextAtSize(test, size) <= maxW) { cur = test; continue; }
    if (cur !== "") { lines.push(cur); cur = ""; }
    let w = word;
    // a single very long word (e.g. a URL): break it by characters
    while (w !== "" && font.widthOfTextAtSize(w, size) > maxW) {
      let n = w.length - 1;
      while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > maxW) n--;
      lines.push(w.slice(0, n));
      w = w.slice(n);
    }
    cur = w;
  }
  lines.push(cur);
  return lines;
}

const FOOT_SIZE = 8;
const NAME_SIZE = 22;

function fit(font: PDFFont, size: number, maxW: number, t: string): string {
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  let n = t.length;
  while (n > 1 && font.widthOfTextAtSize(t.slice(0, n) + "...", size) > maxW) n--;
  return t.slice(0, n).trimEnd() + "...";
}

/** The words of the header and footer, already cut to fit the page (the app draws the same lines). */
function buildFrame(p: LetterProfile, bold: PDFFont, small: PDFFont): LetterFrame {
  const maxW = PAGE_W - 2 * 2.2 * CM;
  const pr = (t: string, f: PDFFont) => toPrintable(t, f).text;
  const l1 = pr(p.address.split("\n").filter(Boolean).join(", "), small);
  const l2 = pr([p.phone && `Tel: ${p.phone}`, p.email && `Email: ${p.email}`, p.website].filter(Boolean).join("  |  "), small);
  const l3 = pr([p.companyNumber && `Company No. ${p.companyNumber}`, p.footerNote].filter(Boolean).join("  |  "), small);
  return {
    headerH: HEADER_H,
    accentH: ACCENT_H,
    name: fit(bold, NAME_SIZE, maxW, pr(p.companyName, bold)),
    tagline: fit(small, 10, maxW, pr(p.tagline, small)),
    footer: [l1, l2, l3].filter(Boolean).map((l) => fit(small, FOOT_SIZE, maxW, l)),
  };
}

export class LetterTooLongError extends Error {}

/** Lays the text out on A4 pages inside the margins. Throws LetterTooLongError past the limits. */
export async function layoutLetter(text: string, settings: LetterSettings, profile: LetterProfile = DEFAULT_PROFILE, doc?: PDFDocument): Promise<{ layout: LetterLayout; doc: PDFDocument; font: PDFFont; bold: PDFFont; small: PDFFont }> {
  if (text.length > MAX_TEXT) throw new LetterTooLongError(`Letter is too long (max ${MAX_TEXT} characters).`);
  const d = doc ?? (await PDFDocument.create());
  const font = await d.embedFont(STD[settings.font]);
  const { text: printable, replaced } = toPrintable(cleanText(text), font);
  const bold = await d.embedFont(StandardFonts.HelveticaBold);
  const small = await d.embedFont(StandardFonts.Helvetica);
  const frame = buildFrame(profile, bold, small);

  const size = settings.fontSize;
  const lineHeight = Math.round(size * 1.42 * 10) / 10;
  const left = settings.margins.left * CM;
  const maxW = PAGE_W - left - settings.margins.right * CM;
  const top = settings.margins.top * CM;
  const contentH = PAGE_H - top - settings.margins.bottom * CM;
  const perPage = Math.max(1, Math.floor((contentH - size * 0.3) / lineHeight));

  const all: string[] = [];
  for (const para of printable.split("\n")) all.push(...wrapParagraph(font, size, maxW, para));
  while (all.length && all[all.length - 1] === "") all.pop(); // trailing blank lines

  const pages: { lines: LetterLine[] }[] = [];
  let cur: LetterLine[] = [];
  let row = 0;
  for (const t of all) {
    if (row >= perPage) { pages.push({ lines: cur }); cur = []; row = 0; }
    if (row === 0 && t === "" && pages.length > 0) continue; // no blank line at the top of a continuation page
    cur.push({ t, y: top + row * lineHeight + size });
    row++;
  }
  pages.push({ lines: cur });
  if (pages.length > MAX_PAGES) throw new LetterTooLongError(`Letter is too long (max ${MAX_PAGES} pages).`);

  return { layout: { page: { w: PAGE_W, h: PAGE_H }, left, size, lineHeight, font: settings.font, frame, pages, replaced }, doc: d, font, bold, small };
}

/** Draws the header band and the footer on one page. y values are PDF points (origin bottom-left). */
function drawFrame(page: import("pdf-lib").PDFPage, f: LetterFrame, bold: PDFFont, small: PDFFont) {
  const left = 2.2 * CM;
  page.drawRectangle({ x: 0, y: PAGE_H - f.headerH, width: PAGE_W, height: f.headerH, color: rgb(0.04, 0.04, 0.06) });
  page.drawRectangle({ x: 0, y: PAGE_H - f.headerH - f.accentH, width: PAGE_W, height: f.accentH, color: rgb(1, 0.69, 0.125) });
  page.drawText(f.name, { x: left, y: PAGE_H - (f.tagline ? 38 : 46), size: NAME_SIZE, font: bold, color: rgb(1, 1, 1) });
  if (f.tagline) page.drawText(f.tagline, { x: left, y: PAGE_H - 58, size: 10, font: small, color: rgb(0.78, 0.78, 0.82) });
  if (f.footer.length) {
    const lineGap = 11;
    const lastY = 22;
    const topY = lastY + (f.footer.length - 1) * lineGap;
    page.drawLine({ start: { x: left, y: topY + 14 }, end: { x: PAGE_W - left, y: topY + 14 }, thickness: 0.6, color: rgb(0.82, 0.82, 0.85) });
    f.footer.forEach((t, i) => {
      const w = small.widthOfTextAtSize(t, FOOT_SIZE);
      page.drawText(t, { x: (PAGE_W - w) / 2, y: topY - i * lineGap, size: FOOT_SIZE, font: small, color: rgb(0.36, 0.36, 0.4) });
    });
  }
}

/** Builds the PDF: every page gets the drawn letterhead (header + footer), then the text on top. */
export async function buildLetterPdf(profile: LetterProfile, text: string, settings: LetterSettings): Promise<Uint8Array> {
  const { layout, doc, font, bold, small } = await layoutLetter(text, settings, profile);
  for (const pg of layout.pages) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    drawFrame(page, layout.frame, bold, small);
    for (const ln of pg.lines) {
      if (ln.t === "") continue;
      page.drawText(ln.t, { x: layout.left, y: PAGE_H - ln.y, size: layout.size, font, color: rgb(0.09, 0.09, 0.1) });
    }
  }
  doc.setTitle("Letter");
  doc.setCreator(profile.companyName);
  doc.setProducer(profile.companyName);
  return doc.save();
}
