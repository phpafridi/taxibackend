// lib/brandstore.ts — keeps the letterhead + business-card pictures as small files on the server disk.
// No database table is used, so there is nothing to migrate. Default folder: /upload/brand
// (the same persistent /upload folder the car photos use). Override with the BRAND_DIR env variable.
import fs from "fs";
import path from "path";

export type BrandRow = { kind: string; image: string; meta: string | null; shareToken: string | null; createdAt: Date; updatedAt: Date };

let dirCache: string | null = null;
function dir(): string {
  if (dirCache) return dirCache;
  const wanted = (process.env.BRAND_DIR || "/upload/brand").trim();
  for (const d of [wanted, path.join(process.cwd(), "storage", "brand")]) {
    try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); dirCache = d; return d; } catch { /* try next */ }
  }
  throw new Error("No writable folder for brand files. Set BRAND_DIR.");
}
const fileOf = (kind: string) => path.join(dir(), `${kind.replace(/[^A-Z_]/g, "")}.json`);

function read(kind: string): BrandRow | null {
  try {
    const j = JSON.parse(fs.readFileSync(fileOf(kind), "utf8"));
    if (typeof j.image !== "string") return null;
    return { kind, image: j.image, meta: j.meta ?? null, shareToken: j.shareToken ?? null, createdAt: new Date(j.createdAt), updatedAt: new Date(j.updatedAt) };
  } catch { return null; }
}
function write(row: BrandRow) {
  const f = fileOf(row.kind); const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ image: row.image, meta: row.meta, shareToken: row.shareToken, createdAt: row.createdAt, updatedAt: row.updatedAt }));
  fs.renameSync(tmp, f);
}

export const KINDS = ["LETTERHEAD", "BUSINESS_CARD"];

export const brandStore = {
  get: (kind: string) => read(kind),
  all: () => KINDS.map(read).filter((r): r is BrandRow => !!r),
  byToken: (kind: string, token: string) => { const r = read(kind); return r && r.shareToken === token ? r : null; },
  /** Create or update; fields left out keep their old value. */
  save(kind: string, patch: { image?: string; meta?: string | null; shareToken?: string | null }): BrandRow {
    const old = read(kind); const now = new Date();
    const row: BrandRow = {
      kind,
      image: patch.image ?? old?.image ?? "",
      meta: patch.meta !== undefined ? patch.meta : old?.meta ?? null,
      shareToken: patch.shareToken !== undefined ? patch.shareToken : old?.shareToken ?? null,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    };
    write(row);
    return row;
  },
  remove(kind: string) { try { fs.unlinkSync(fileOf(kind)); } catch { /* already gone */ } },
};
