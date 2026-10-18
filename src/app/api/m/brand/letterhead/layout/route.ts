// POST /api/m/brand/letterhead/layout { text, settings?, profile? } → header, footer and where every line falls on each page.
// The app draws its live preview from this, so the preview matches the PDF. Nothing is saved here.
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { readConfig } from "../../../../../../../lib/brand";
import { LetterTooLongError, layoutLetter, normaliseProfile, normaliseSettings } from "../../../../../../../lib/letterhead";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const text = typeof body.text === "string" ? body.text : "";
    const cfg = await readConfig();
    const settings = normaliseSettings(body.settings, cfg.settings);
    const profile = normaliseProfile(body.profile, cfg.profile);
    try {
      const { layout } = await layoutLetter(text, settings, profile);
      return NextResponse.json({ ...layout, settings });
    } catch (e) {
      if (e instanceof LetterTooLongError) return NextResponse.json({ message: e.message }, { status: 413 });
      throw e;
    }
  } catch (err) { return fail("brand/letterhead/layout", err); }
}
