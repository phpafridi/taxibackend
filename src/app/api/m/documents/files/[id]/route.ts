// GET (the file with its contents, to open/share), PUT (rename / move to another tag), DELETE.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { id } = await params;
    const r = await prisma.admindoc.findUnique({ where: { id: Number(id) } });
    if (!r) return NextResponse.json({ message: "File not found" }, { status: 404 });
    return NextResponse.json({ id: r.id, name: r.name, fileName: r.fileName, mimeType: r.mimeType, size: r.size, tagId: r.tagId, data: r.data });
  } catch (err) { return fail("documents/files/[id] GET", err); }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 255);
      if (!name) return NextResponse.json({ message: "Enter a name" }, { status: 400 });
      data.name = name;
    }
    if (b.tagId !== undefined) {
      if (b.tagId === null || b.tagId === "") data.tagId = null;
      else {
        const t = await prisma.admintag.findUnique({ where: { id: Number(b.tagId) } });
        if (!t) return NextResponse.json({ message: "That tag no longer exists" }, { status: 404 });
        data.tagId = t.id;
      }
    }
    const r = await prisma.admindoc.update({ where: { id: Number(id) }, data, select: { id: true, name: true, tagId: true } });
    return NextResponse.json(r);
  } catch (err) { return fail("documents/files/[id] PUT", err); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { id } = await params;
    await prisma.admindoc.delete({ where: { id: Number(id) } }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) { return fail("documents/files/[id] DELETE", err); }
}
