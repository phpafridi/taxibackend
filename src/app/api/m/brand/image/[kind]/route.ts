// GET /api/m/brand/image/letterhead | card — the stored picture (admin only; the app fetches it with its login token).
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma, requireUser, requireAdmin } from "../../../../../../../lib/mobile-api";
import { KIND_CARD, KIND_LETTERHEAD } from "../../../../../../../lib/brand";
import { parseDataUri } from "../../../../../../../lib/letterhead";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { kind } = await params;
    const k = kind === "letterhead" ? KIND_LETTERHEAD : kind === "card" ? KIND_CARD : null;
    if (!k) return new NextResponse(null, { status: 404 });
    const row = await prisma.brandasset.findUnique({ where: { kind: k }, select: { image: true } });
    const img = row ? parseDataUri(row.image) : null;
    if (!img) return new NextResponse(null, { status: 404 });
    const etag = `"${createHash("md5").update(img.bytes).digest("hex")}"`;
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    return new NextResponse(new Uint8Array(img.bytes), {
      status: 200,
      headers: { "Content-Type": img.mime, "Content-Length": String(img.bytes.length), ETag: etag, "Cache-Control": "private, max-age=86400" },
    });
  } catch { return new NextResponse(null, { status: 404 }); }
}
