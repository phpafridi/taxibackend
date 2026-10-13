// Puts a large red diagonal stamp (TERMINATED / EXPIRED / CANCELLED) across every page of a downloaded agreement or
// certificate, so a copy of something that is no longer in force can never be mistaken for a live one.
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs";

export type StampKind = "TERMINATED" | "EXPIRED" | "CANCELLED";

type StampSource = { status?: string | null; endDate?: Date | string | null; terminatedAt?: Date | string | null };

/** Which stamp (if any) a document should carry right now. A SIGNED document past its end date counts as expired
 *  even if the nightly job has not flipped its stored status yet. */
export function stampKindFor(a: StampSource): StampKind | null {
  if (a.status === "TERMINATED" || a.terminatedAt) return "TERMINATED";
  if (a.status === "CANCELLED") return "CANCELLED";
  if (a.status === "EXPIRED") return "EXPIRED";
  if (a.status === "SIGNED" && a.endDate) {
    const today = new Date(new Date().toDateString());
    if (new Date(a.endDate) < today) return "EXPIRED";
  }
  return null;
}

/** The date shown under the stamp: when it was terminated / when it ended. */
export function stampDateFor(kind: StampKind, a: StampSource): string | undefined {
  const d = kind === "TERMINATED" ? (a.terminatedAt ?? undefined) : kind === "EXPIRED" ? (a.endDate ?? undefined) : undefined;
  if (!d) return undefined;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return undefined;
  const label = kind === "TERMINATED" ? "Terminated" : "Ended";
  return `${label} ${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}

/** Stamps every page of the PDF at `filePath` in place. */
export async function stampPdfFile(filePath: string, kind: StampKind, subLabel?: string): Promise<void> {
  const doc = await PDFDocument.load(fs.readFileSync(filePath));
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(0.78, 0.1, 0.1);
  const angle = 32;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  // rotate a vector (x, y) by the stamp angle
  const rot = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    // size the word so the tilted box fits inside the page width with a margin
    const unitW = bold.widthOfTextAtSize(kind, 1);
    const size = Math.min(Math.min(width, height) * 0.14, (width * 0.7) / (unitW + 0.9));
    const textW = bold.widthOfTextAtSize(kind, size);
    const subSize = size * 0.26;
    const rw = textW + size * 0.9;
    const rh = size * 1.0 + (subLabel ? subSize * 1.6 : 0) + size * 0.5;
    // place the box so its centre is the page centre
    const c = rot(rw / 2, rh / 2);
    const ox = width / 2 - c.x, oy = height / 2 - c.y;

    page.drawRectangle({ x: ox, y: oy, width: rw, height: rh, rotate: degrees(angle), borderColor: color, borderWidth: 5, opacity: 0, borderOpacity: 0.55 });
    const t = rot(size * 0.45, rh - size * 0.25 - size * 0.74);
    page.drawText(kind, { x: ox + t.x, y: oy + t.y, size, font: bold, color, rotate: degrees(angle), opacity: 0.55 });
    if (subLabel) {
      const sw = bold.widthOfTextAtSize(subLabel, subSize);
      const s = rot((rw - sw) / 2, size * 0.28);
      page.drawText(subLabel, { x: ox + s.x, y: oy + s.y, size: subSize, font: bold, color, rotate: degrees(angle), opacity: 0.6 });
    }
  }
  fs.writeFileSync(filePath, await doc.save());
}
