// GET  /api/m/documents/files?tagId=<id|none>&q=<search>  — list files (without their contents)
// POST /api/m/documents/files                              — add a file { name, fileName, mimeType, data (base64), tagId? }
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";

export const MAX_BYTES = 40 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const url = new URL(req.url);
    const tagId = url.searchParams.get("tagId");
    const q = (url.searchParams.get("q") || "").trim();
    const where: Record<string, unknown> = {};
    if (tagId === "none") where.tagId = null;
    else if (tagId) where.tagId = Number(tagId);
    if (q) where.OR = [{ name: { contains: q } }, { fileName: { contains: q } }];
    const rows = await prisma.admindoc.findMany({
      where: where as never, orderBy: { createdAt: "desc" }, take: 500,
      select: { id: true, name: true, fileName: true, mimeType: true, size: true, tagId: true, createdAt: true, tag: { select: { name: true, color: true } } },
    });
    return NextResponse.json({
      files: rows.map((r) => ({ id: r.id, name: r.name, fileName: r.fileName, mimeType: r.mimeType, size: r.size, tagId: r.tagId, tagName: r.tag?.name ?? null, tagColor: r.tag?.color ?? null, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) { return fail("documents/files GET", err); }
}

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const b = await req.json().catch(() => ({}));
    const fileName = String(b.fileName ?? "").trim().slice(0, 255) || "document";
    const name = String(b.name ?? "").trim().slice(0, 255) || fileName;
    const mimeType = String(b.mimeType ?? "").toLowerCase().trim();
    let data = String(b.data ?? "");
    data = data.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
    if (!data) return NextResponse.json({ message: "No file received" }, { status: 400 });
    if (!ALLOWED.has(mimeType)) return NextResponse.json({ message: "This file type is not supported. Use PDF, a photo, Word, Excel, CSV or text." }, { status: 415 });
    const size = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    if (size > MAX_BYTES) return NextResponse.json({ message: "File is too large (maximum 40 MB)" }, { status: 413 });
    let tagId: number | null = null;
    if (b.tagId !== undefined && b.tagId !== null && b.tagId !== "") {
      tagId = Number(b.tagId);
      const t = await prisma.admintag.findUnique({ where: { id: tagId } });
      if (!t) return NextResponse.json({ message: "That tag no longer exists" }, { status: 404 });
    }
    const row = await prisma.admindoc.create({ data: { name, fileName, mimeType, size, data, tagId, createdById: g.user.id } });
    return NextResponse.json({ id: row.id, name: row.name, fileName: row.fileName, mimeType: row.mimeType, size: row.size, tagId: row.tagId, createdAt: row.createdAt.toISOString() }, { status: 201 });
  } catch (err) { return fail("documents/files POST", err); }
}
