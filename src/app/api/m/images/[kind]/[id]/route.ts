// GET /api/m/images/user/:userId   → a person's profile photo
// GET /api/m/images/car/:carId     → a car's photo
// Photos are stored as base64 text in the database. Lists used to carry them inline (slow); now lists carry a small
// `avatarUrl` and the app fetches the picture only when it is shown. Cached hard by the app via the ?v= token.
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma, requireUser, driverProfileIdFor } from "../../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { kind, id } = await params;
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) return new NextResponse(null, { status: 404 });
    const admin = g.user.role === "ADMIN";

    let raw: string | null = null;
    if (kind === "user") {
      if (!admin && g.user.id !== n) return new NextResponse(null, { status: 404 });
      const u = await prisma.user.findUnique({ where: { id: n }, select: { avatar: true } });
      raw = (u as { avatar: string | null } | null)?.avatar ?? null;
    } else if (kind === "car") {
      if (!admin) {
        const dpid = await driverProfileIdFor(g.user.id);
        const own = await prisma.car.findFirst({ where: { id: n, driverProfileId: dpid ?? -1 }, select: { id: true } });
        if (!own) return new NextResponse(null, { status: 404 });
      }
      const c = await prisma.car.findUnique({ where: { id: n }, select: { avatar: true } });
      raw = (c as { avatar: string | null } | null)?.avatar ?? null;
    } else return new NextResponse(null, { status: 404 });

    if (!raw) return new NextResponse(null, { status: 404 });
    let mime = "image/jpeg"; let b64 = raw;
    const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(raw);
    if (m) { mime = m[1]; b64 = m[2]; }
    const buf = Buffer.from(b64, "base64");
    if (!buf.length) return new NextResponse(null, { status: 404 });
    const etag = `"${createHash("md5").update(buf).digest("hex")}"`;
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: { "Content-Type": mime, "Content-Length": String(buf.length), ETag: etag, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
