// PUT /api/m/brand/letterhead/settings { margins?, font?, fontSize? } — remember where the text may start / end
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { KIND_LETTERHEAD, brandStatus, readSettings } from "../../../../../../../lib/brand";
import { normaliseSettings } from "../../../../../../../lib/letterhead";

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const row = await prisma.brandasset.findUnique({ where: { kind: KIND_LETTERHEAD }, select: { meta: true } });
    if (!row) return NextResponse.json({ message: "Upload a letterhead first." }, { status: 404 });
    const settings = normaliseSettings(body, readSettings(row.meta));
    await prisma.brandasset.update({ where: { kind: KIND_LETTERHEAD }, data: { meta: JSON.stringify(settings) } });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/letterhead/settings", err); }
}
