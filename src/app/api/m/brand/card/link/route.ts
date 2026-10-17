// POST /api/m/brand/card/link — make a NEW share link; the old one stops working straight away.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { KIND_CARD, brandStatus, newShareToken } from "../../../../../../../lib/brand";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const row = await prisma.brandasset.findUnique({ where: { kind: KIND_CARD }, select: { id: true } });
    if (!row) return NextResponse.json({ message: "Upload your business card first." }, { status: 404 });
    await prisma.brandasset.update({ where: { kind: KIND_CARD }, data: { shareToken: newShareToken() } });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card/link", err); }
}
