// POST /api/m/brand/letterhead/layout { text, settings? } → where every line of the letter falls on each page.
// The app draws its live preview from this, so the preview matches the PDF exactly.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { KIND_LETTERHEAD, readSettings } from "../../../../../../../lib/brand";
import { LetterTooLongError, layoutLetter, normaliseSettings } from "../../../../../../../lib/letterhead";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const text = typeof body.text === "string" ? body.text : "";
    const row = await prisma.brandasset.findUnique({ where: { kind: KIND_LETTERHEAD }, select: { meta: true } });
    const settings = normaliseSettings(body.settings, readSettings(row?.meta));
    try {
      const { layout } = await layoutLetter(text, settings);
      return NextResponse.json({ ...layout, settings });
    } catch (e) {
      if (e instanceof LetterTooLongError) return NextResponse.json({ message: e.message }, { status: 413 });
      throw e;
    }
  } catch (err) { return fail("brand/letterhead/layout", err); }
}
