// PUT (rename / recolour) and DELETE (files stay, they become "Untagged") for one tag.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";

const COLORS = ["#FF9500", "#007AFF", "#34C759", "#AF52DE", "#FF3B30", "#8E8E93"];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 80);
      if (!name) return NextResponse.json({ message: "Enter a tag name" }, { status: 400 });
      const dupe = await prisma.admintag.findFirst({ where: { name, NOT: { id: Number(id) } } });
      if (dupe) return NextResponse.json({ message: "A tag with this name already exists" }, { status: 409 });
      data.name = name;
    }
    if (b.color !== undefined && COLORS.includes(String(b.color))) data.color = String(b.color);
    const t = await prisma.admintag.update({ where: { id: Number(id) }, data });
    return NextResponse.json({ id: t.id, name: t.name, color: t.color });
  } catch (err) { return fail("documents/tags/[id] PUT", err); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const { id } = await params;
    await prisma.admintag.delete({ where: { id: Number(id) } }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) { return fail("documents/tags/[id] DELETE", err); }
}
