// GET /card/<token>/image            — the business card picture (public, anyone with the link)
// GET /card/<token>/image?download=1 — same, but as a file download
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { KIND_CARD, TOKEN_RE } from "../../../../../lib/brand";
import { parseDataUri } from "../../../../../lib/letterhead";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!TOKEN_RE.test(token)) return new NextResponse(null, { status: 404 });
    const row = await prisma.brandasset.findFirst({ where: { kind: KIND_CARD, shareToken: token }, select: { image: true } });
    const img = row ? parseDataUri(row.image) : null;
    if (!img) return new NextResponse(null, { status: 404 });
    const ext = img.mime === "image/png" ? "png" : img.mime === "image/webp" ? "webp" : "jpg";
    const download = new URL(req.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(img.bytes), {
      status: 200,
      headers: {
        "Content-Type": img.mime,
        "Content-Length": String(img.bytes.length),
        "Cache-Control": "public, max-age=300",
        ...(download ? { "Content-Disposition": `attachment; filename="RS-Private-Hire-Business-Card.${ext}"` } : {}),
      },
    });
  } catch { return new NextResponse(null, { status: 404 }); }
}
