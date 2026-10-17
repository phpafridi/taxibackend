// POST /api/m/brand/letterhead/pdf { text, settings? } → the letter as a PDF on the client's letterhead.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { KIND_LETTERHEAD, readSettings } from "../../../../../../../lib/brand";
import { LetterTooLongError, buildLetterPdf, normaliseSettings, parseDataUri } from "../../../../../../../lib/letterhead";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) return NextResponse.json({ message: "Type the letter first." }, { status: 400 });
    const row = await prisma.brandasset.findUnique({ where: { kind: KIND_LETTERHEAD } });
    if (!row) return NextResponse.json({ message: "Upload a letterhead first." }, { status: 404 });
    const lh = parseDataUri(row.image);
    if (!lh) return NextResponse.json({ message: "The saved letterhead is damaged. Please upload it again." }, { status: 422 });
    const settings = normaliseSettings(body.settings, readSettings(row.meta));
    try {
      const pdf = await buildLetterPdf(lh, text, settings);
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": 'attachment; filename="Letter.pdf"', "Cache-Control": "no-store" },
      });
    } catch (e) {
      if (e instanceof LetterTooLongError) return NextResponse.json({ message: e.message }, { status: 413 });
      throw e;
    }
  } catch (err) { return fail("brand/letterhead/pdf", err); }
}
