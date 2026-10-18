// GET /api/m/brand/card/pdf — the business card as a print-ready PDF (admin, used by the app's Download button)
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { buildCardPdf, cardIsEmpty, readCard } from "../../../../../../../lib/card";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const { profile } = await readCard();
    if (cardIsEmpty(profile)) return NextResponse.json({ message: "Fill in and save your card details first." }, { status: 400 });
    const pdf = await buildCardPdf(profile);
    return new NextResponse(Buffer.from(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Cache-Control": "no-store" } });
  } catch (err) { return fail("brand/card/pdf", err); }
}
