// lib/brand.ts — shared helpers for the letterhead feature + the status the app screens open with.
//  • Letterhead contact details + font settings live in the existing `systemsetting` table (key "letterhead.config").
//  • Typed letters are kept in the `savedletter` table.
//  • The business card details + share link live in `systemsetting` too (see card.ts).
import { prisma } from "./prisma";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, normaliseProfile, normaliseSettings, type LetterProfile, type LetterSettings } from "./letterhead";
import { readCard, shareUrlFor } from "./card";

const CONFIG_KEY = "letterhead.config";

export type LetterConfig = { profile: LetterProfile; settings: LetterSettings };

export async function readConfig(): Promise<LetterConfig> {
  const row = await prisma.systemsetting.findUnique({ where: { key: CONFIG_KEY }, select: { value: true } });
  let j: Record<string, unknown> = {};
  try { j = row?.value ? JSON.parse(row.value) : {}; } catch { j = {}; }
  return { profile: normaliseProfile(j.profile, DEFAULT_PROFILE), settings: normaliseSettings(j.settings, DEFAULT_SETTINGS) };
}

export async function saveConfig(cfg: LetterConfig, userId?: number | null): Promise<void> {
  const value = JSON.stringify(cfg);
  await prisma.systemsetting.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value, group: "LETTERHEAD", type: "JSON", isPublic: false, createdBy: userId ?? null, updatedBy: userId ?? null, updatedAt: new Date() },
    update: { value, updatedBy: userId ?? null, updatedAt: new Date() },
  });
}

/** What the app needs to open the Letterhead / Business card screens. */
export async function brandStatus() {
  const [cfg, card] = await Promise.all([readConfig(), readCard()]);
  return {
    letterhead: { profile: cfg.profile, settings: cfg.settings },
    card: { profile: card.profile, shareUrl: shareUrlFor(card.shareToken) },
  };
}

/** A short title for a letter: its first non-empty line. */
export function letterTitle(body: string): string {
  const first = body.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "Letter";
  return first.slice(0, 80);
}
