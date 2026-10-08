import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, serializeWeeklyPayment, fail } from "../../../../../../../../lib/mobile-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const row = await prisma.weeklypayment.update({
      where: { id: Number(id) },
      data: { status: "PAID", paidAt: new Date(), method: body.method != null ? String(body.method) : undefined, reference: body.reference != null ? String(body.reference) : undefined, updatedAt: new Date() },
    });
    return NextResponse.json(serializeWeeklyPayment(row as never));
  } catch (err) { return fail("payments/weekly/[id]/pay", err); }
}
