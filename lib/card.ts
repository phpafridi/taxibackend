// lib/card.ts — the business card is built from details the admin keeps in the app (nothing is uploaded).
// Details + the public share token live in the existing `systemsetting` table (key "businesscard.config").
// The card can be shown as a web page, downloaded as a print-ready PDF (90 x 55 mm) or saved as a phone contact (vCard).
import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { prisma } from "./prisma";

export type CardProfile = { name: string; jobTitle: string; company: string; phone: string; email: string; website: string; address: string };
export const DEFAULT_CARD: CardProfile = { name: "", jobTitle: "", company: "RS Private Hire", phone: "", email: "", website: "rsphire.co.uk", address: "" };
const MAX: Record<keyof CardProfile, number> = { name: 60, jobTitle: 60, company: 60, phone: 40, email: 80, website: 80, address: 160 };

export function normaliseCard(raw: unknown, base: CardProfile = DEFAULT_CARD): CardProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...base };
  for (const k of Object.keys(MAX) as (keyof CardProfile)[]) {
    if (typeof r[k] === "string") {
      // eslint-disable-next-line no-control-regex
      out[k] = (r[k] as string).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX[k]);
    }
  }
  return out;
}

const KEY = "businesscard.config";
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
export const newShareToken = () => crypto.randomBytes(18).toString("base64url"); // 24 URL-safe characters

export type CardConfig = { profile: CardProfile; shareToken: string | null };
export type CardRead = CardConfig & { exists: boolean }; // exists = the admin has saved the card at least once

export async function readCard(): Promise<CardRead> {
  const row = await prisma.systemsetting.findUnique({ where: { key: KEY }, select: { value: true } });
  let j: Record<string, unknown> = {};
  try { j = row?.value ? JSON.parse(row.value) : {}; } catch { j = {}; }
  const t = typeof j.shareToken === "string" && TOKEN_RE.test(j.shareToken) ? j.shareToken : null;
  return { profile: normaliseCard(j.profile, DEFAULT_CARD), shareToken: t, exists: !!row };
}

export async function saveCard(cfg: CardConfig, userId?: number | null): Promise<void> {
  const value = JSON.stringify(cfg);
  await prisma.systemsetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, group: "BUSINESS_CARD", type: "JSON", isPublic: false, createdBy: userId ?? null, updatedBy: userId ?? null, updatedAt: new Date() },
    update: { value, updatedBy: userId ?? null, updatedAt: new Date() },
  });
}

/** The card for a public link (null when the token is wrong or sharing is switched off). */
export async function readCardByToken(token: string): Promise<CardProfile | null> {
  if (!TOKEN_RE.test(token)) return null;
  const c = await readCard();
  return c.shareToken && c.shareToken === token ? c.profile : null;
}

export function siteBase(): string {
  return (process.env.PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://rsphire.co.uk").trim().replace(/\/+$/, "");
}
export const shareUrlFor = (token: string | null) => (token ? `${siteBase()}/card/${token}` : undefined);

/** True when there is nothing worth printing yet. */
export const cardIsEmpty = (p: CardProfile) => !p.name && !p.jobTitle && !p.phone && !p.email && !p.address;

/** The contact lines in print order. */
export function contactLines(p: CardProfile): string[] {
  return [p.phone, p.email, p.website, p.address].filter(Boolean);
}

// ── vCard (.vcf) so people can save the contact in one tap ──
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
export function buildVcard(p: CardProfile): string {
  const parts = p.name.split(" ");
  const last = parts.length > 1 ? parts.pop()! : "";
  const first = parts.join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(p.name || p.company)}`, `N:${esc(last)};${esc(first)};;;`];
  if (p.company) lines.push(`ORG:${esc(p.company)}`);
  if (p.jobTitle) lines.push(`TITLE:${esc(p.jobTitle)}`);
  if (p.phone) lines.push(`TEL;TYPE=WORK,VOICE:${esc(p.phone)}`);
  if (p.email) lines.push(`EMAIL;TYPE=WORK:${esc(p.email)}`);
  if (p.website) lines.push(`URL:${esc(/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`)}`);
  if (p.address) lines.push(`ADR;TYPE=WORK:;;${esc(p.address)};;;;`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

// ── Print-ready PDF, 90 x 55 mm. The app draws its preview with the same numbers (points, origin top-left). ──
export const CARD_W = 255.12;
export const CARD_H = 155.91;
const PAD = 18;

function printable(t: string, font: PDFFont): string {
  let out = "";
  for (const ch of t) { try { font.widthOfTextAtSize(ch, 10); out += ch; } catch { out += "?"; } }
  return out;
}
function fit(font: PDFFont, size: number, maxW: number, t: string): string {
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  let n = t.length;
  while (n > 1 && font.widthOfTextAtSize(t.slice(0, n) + "...", size) > maxW) n--;
  return t.slice(0, n).trimEnd() + "...";
}

export async function buildCardPdf(p: CardProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([CARD_W, CARD_H]);
  const maxW = CARD_W - PAD * 2;
  page.drawRectangle({ x: 0, y: 0, width: CARD_W, height: CARD_H, color: rgb(0.04, 0.04, 0.06) });
  page.drawRectangle({ x: 0, y: 0, width: CARD_W, height: 5, color: rgb(1, 0.69, 0.125) });
  if (p.company) page.drawText(fit(bold, 8, maxW, printable(p.company.toUpperCase(), bold)), { x: PAD, y: CARD_H - 26, size: 8, font: bold, color: rgb(1, 0.69, 0.125) });
  if (p.name) page.drawText(fit(bold, 19, maxW, printable(p.name, bold)), { x: PAD, y: CARD_H - 56, size: 19, font: bold, color: rgb(1, 1, 1) });
  if (p.jobTitle) page.drawText(fit(reg, 9, maxW, printable(p.jobTitle, reg)), { x: PAD, y: CARD_H - 71, size: 9, font: reg, color: rgb(0.78, 0.78, 0.82) });
  const lines = contactLines(p);
  lines.forEach((t, i) => {
    const y = 20 + (lines.length - 1 - i) * 12; // last line sits lowest
    page.drawText(fit(reg, 7.5, maxW, printable(t, reg)), { x: PAD, y, size: 7.5, font: reg, color: rgb(0.86, 0.86, 0.9) });
  });
  doc.setTitle(`${p.name || p.company} - business card`);
  doc.setCreator(p.company || "Business card");
  doc.setProducer(p.company || "Business card");
  return doc.save();
}
