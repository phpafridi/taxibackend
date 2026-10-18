// POST /api/m/brand/letterhead/pdf { text, settings?, letterId? } → the letter as a PDF on the company letterhead.
// The letter is also saved (or updated when letterId is given) so the admin can open it again later; its id comes back in
// the X-Letter-Id header.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { letterTitle, readConfig } from "../../../../../../../lib/brand";
import { LetterTooLongError, buildLetterPdf, normaliseSettings } from "../../../../../../../lib/letterhead";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) return NextResponse.json({ message: "Type the letter first." }, { status: 400 });
    const cfg = await readConfig();
    const settings = normaliseSettings(body.settings, cfg.settings);
    let pdf: Uint8Array;
    try { pdf = await buildLetterPdf(cfg.profile, text, settings); }
    catch (e) {
      if (e instanceof LetterTooLongError) return NextResponse.json({ message: e.message }, { status: 413 });
      throw e;
    }

    // keep a copy so it can be reopened (a failure here must not stop the download)
    let letterId = 0;
    try {
      const wanted = Number(body.letterId);
      const data = { title: letterTitle(text), body: text };
      const existing = Number.isInteger(wanted) && wanted > 0 ? await prisma.savedletter.findUnique({ where: { id: wanted }, select: { id: true } }) : null;
      const row = existing
        ? await prisma.savedletter.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() }, select: { id: true } })
        : await prisma.savedletter.create({ data: { ...data, createdById: g.user.id }, select: { id: true } });
      letterId = row.id;
    } catch (e) { console.error("[brand/letterhead/pdf] could not save the letter copy:", e); }

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": 'attachment; filename="Letter.pdf"',
        "Cache-Control": "no-store", ...(letterId ? { "X-Letter-Id": String(letterId) } : {}),
      },
    });
  } catch (err) { return fail("brand/letterhead/pdf", err); }
}
