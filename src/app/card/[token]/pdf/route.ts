// GET /card/<token>/pdf — print-ready card PDF (public, anyone with the link)
import { NextResponse } from "next/server";
import { buildCardPdf, readCardByToken } from "../../../../../lib/card";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const p = await readCardByToken((await params).token);
    if (!p) return new NextResponse(null, { status: 404 });
    const pdf = await buildCardPdf(p);
    return new NextResponse(Buffer.from(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": 'attachment; filename="Business-Card.pdf"', "Cache-Control": "no-store" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
