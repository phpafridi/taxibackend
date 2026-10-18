// GET    /api/m/letters/:id — one saved letter with its full text
// DELETE /api/m/letters/:id — remove it
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";

const parseId = (raw: string) => { const n = Number(raw); return Number.isInteger(n) && n > 0 ? n : null; };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const id = parseId((await params).id);
    const row = id ? await prisma.savedletter.findUnique({ where: { id } }) : null;
    if (!row) return NextResponse.json({ message: "Letter not found." }, { status: 404 });
    return NextResponse.json({ id: row.id, title: row.title, body: row.body, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) { return fail("letters/id", err); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const id = parseId((await params).id);
    if (id) await prisma.savedletter.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) { return fail("letters/id", err); }
}
