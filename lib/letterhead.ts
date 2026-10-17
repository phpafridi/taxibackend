// lib/letterhead.ts
// Turns typed text into letters on the client's own letterhead (an uploaded image used as the page background).
// The SAME layout is used for the in-app preview and for the PDF, so what you see is what you download.
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

export type LetterLine = { t: string; y: number }; // y = text baseline, in points from the TOP of the page
export type LetterLayout = {
  page: { w: number; h: number };
  left: number; // points
  size: number;
  lineHeight: number;
  font: FontKey;
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

export class LetterTooLongError extends Error {}

/** Lays the text out on A4 pages inside the margins. Throws LetterTooLongError past the limits. */
export async function layoutLetter(text: string, settings: LetterSettings, doc?: PDFDocument): Promise<{ layout: LetterLayout; doc: PDFDocument; font: PDFFont }> {
  if (text.length > MAX_TEXT) throw new LetterTooLongError(`Letter is too long (max ${MAX_TEXT} characters).`);
  const d = doc ?? (await PDFDocument.create());
  const font = await d.embedFont(STD[settings.font]);
  const { text: printable, replaced } = toPrintable(cleanText(text), font);

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

  return { layout: { page: { w: PAGE_W, h: PAGE_H }, left, size, lineHeight, font: settings.font, pages, replaced }, doc: d, font };
}

/** Reads a "data:image/…;base64,…" string into bytes + type. */
export function parseDataUri(raw: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(raw);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  return bytes.length ? { mime: m[1].toLowerCase(), bytes } : null;
}

/** Can pdf-lib draw this image? Used to reject unreadable uploads up front (e.g. interlaced PNGs). */
export async function canEmbedImage(mime: string, bytes: Buffer): Promise<boolean> {
  try {
    const d = await PDFDocument.create();
    if (mime === "image/png") await d.embedPng(bytes); else await d.embedJpg(bytes);
    return true;
  } catch { return false; }
}

/** Builds the PDF: every page gets the letterhead as a full-page background, then the text on top. */
export async function buildLetterPdf(letterhead: { mime: string; bytes: Buffer } | null, text: string, settings: LetterSettings): Promise<Uint8Array> {
  const { layout, doc, font } = await layoutLetter(text, settings);
  const img = letterhead ? (letterhead.mime === "image/png" ? await doc.embedPng(letterhead.bytes) : await doc.embedJpg(letterhead.bytes)) : null;

  for (const pg of layout.pages) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    if (img) {
      // "cover": fill the whole page, centred, without stretching the picture
      const s = Math.max(PAGE_W / img.width, PAGE_H / img.height);
      const w = img.width * s, h = img.height * s;
      page.drawImage(img, { x: (PAGE_W - w) / 2, y: (PAGE_H - h) / 2, width: w, height: h });
    }
    for (const ln of pg.lines) {
      if (ln.t === "") continue;
      page.drawText(ln.t, { x: layout.left, y: PAGE_H - ln.y, size: layout.size, font, color: rgb(0.09, 0.09, 0.1) });
    }
  }
  doc.setTitle("Letter");
  doc.setCreator("RS Private Hire");
  doc.setProducer("RS Private Hire");
  return doc.save();
}
