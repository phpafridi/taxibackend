// lib/brand.ts — shared helpers for the letterhead + business-card features.
import crypto from "crypto";
import { prisma } from "./prisma";
import { DEFAULT_SETTINGS, normaliseSettings, type LetterSettings } from "./letterhead";

export const KIND_LETTERHEAD = "LETTERHEAD";
export const KIND_CARD = "BUSINESS_CARD";

export const MAX_IMAGE_CHARS = 9_000_000; // ≈ 6.5 MB of image once decoded

/** Public address of the site, used to build the business-card link. */
export function siteBase(): string {
  return (process.env.PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://rsphire.co.uk").trim().replace(/\/+$/, "");
}

export function newShareToken(): string {
  return crypto.randomBytes(18).toString("base64url"); // 24 URL-safe characters
}
export const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export function readSettings(meta: string | null | undefined): LetterSettings {
  if (!meta) return DEFAULT_SETTINGS;
  try { return normaliseSettings(JSON.parse(meta)); } catch { return DEFAULT_SETTINGS; }
}

/** Light read (no image) for status screens. */
export async function brandStatus() {
  const rows = await prisma.brandasset.findMany({ select: { kind: true, meta: true, shareToken: true, updatedAt: true } });
  const lh = rows.find((r: { kind: string }) => r.kind === KIND_LETTERHEAD);
  const card = rows.find((r: { kind: string }) => r.kind === KIND_CARD);
  return {
    letterhead: {
      exists: !!lh,
      updatedAt: lh?.updatedAt?.toISOString(),
      settings: readSettings(lh?.meta),
      imageUrl: lh ? `/api/m/brand/image/letterhead?v=${lh.updatedAt.getTime()}` : undefined,
    },
    card: {
      exists: !!card,
      updatedAt: card?.updatedAt?.toISOString(),
      imageUrl: card ? `/api/m/brand/image/card?v=${card.updatedAt.getTime()}` : undefined,
      shareUrl: card?.shareToken ? `${siteBase()}/card/${card.shareToken}` : undefined,
    },
  };
}
