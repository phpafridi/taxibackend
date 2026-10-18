// GET /card/<token>/contact — the card as a contact file (.vcf) so it can be saved on a phone in one tap (public)
import { NextResponse } from "next/server";
import { buildVcard, readCardByToken } from "../../../../../lib/card";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const p = await readCardByToken((await params).token);
    if (!p) return new NextResponse(null, { status: 404 });
    return new NextResponse(buildVcard(p), { status: 200, headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": 'attachment; filename="contact.vcf"', "Cache-Control": "no-store" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
