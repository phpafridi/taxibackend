// GET /api/m/documents — admin: the folders (tags) with file counts, plus untagged and total counts.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const [tags, untagged, total] = await Promise.all([
      prisma.admintag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { docs: true } } } }),
      prisma.admindoc.count({ where: { tagId: null } }),
      prisma.admindoc.count(),
    ]);
    return NextResponse.json({
      tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.docs })),
      untagged, total,
    });
  } catch (err) { return fail("documents", err); }
}
