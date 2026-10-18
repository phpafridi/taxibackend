// GET /api/m/letters — the admin's latest saved letters (newest first), without the full text.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const rows = await prisma.savedletter.findMany({ orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true, body: true, createdAt: true, updatedAt: true } });
    return NextResponse.json({
      letters: rows.map((r: { id: number; title: string; body: string; createdAt: Date; updatedAt: Date }) => ({
        id: r.id, title: r.title, snippet: r.body.replace(/\s+/g, " ").trim().slice(0, 140), chars: r.body.length,
        createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) { return fail("letters", err); }
}
