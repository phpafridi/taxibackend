// POST /api/m/documents/tags — create a tag (= a folder).
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";

export const COLORS = ["#FF9500", "#007AFF", "#34C759", "#AF52DE", "#FF3B30", "#8E8E93"];

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const b = await req.json().catch(() => ({}));
    const name = String(b.name ?? "").trim().slice(0, 80);
    if (!name) return NextResponse.json({ message: "Enter a tag name" }, { status: 400 });
    const color = COLORS.includes(String(b.color)) ? String(b.color) : COLORS[0];
    const dupe = await prisma.admintag.findFirst({ where: { name } });
    if (dupe) return NextResponse.json({ message: "A tag with this name already exists" }, { status: 409 });
    const t = await prisma.admintag.create({ data: { name, color } });
    return NextResponse.json({ id: t.id, name: t.name, color: t.color, count: 0 }, { status: 201 });
  } catch (err) { return fail("documents/tags POST", err); }
}
