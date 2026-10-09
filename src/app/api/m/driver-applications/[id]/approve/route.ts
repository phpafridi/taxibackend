// POST /api/m/driver-applications/:id/approve  { weeklyAmount? } — admin only.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden || !g.ok) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const dp = await prisma.driverprofile.findUnique({ where: { id: Number(id) } });
    if (!dp) return NextResponse.json({ message: "Application not found" }, { status: 404 });
    const st = (dp as unknown as { applicationStatus?: string | null }).applicationStatus;
    if (st !== "PENDING" && st !== "REJECTED") return NextResponse.json({ message: "This application is not waiting for review" }, { status: 400 });
    const now = new Date();
    await prisma.user.update({ where: { id: dp.userId }, data: { isActive: true, updatedAt: now } as never });
    const weekly = body.weeklyAmount != null && Number(body.weeklyAmount) >= 0 ? Number(body.weeklyAmount) : undefined;
    const updated = await prisma.driverprofile.update({
      where: { id: dp.id },
      data: { applicationStatus: "APPROVED", rejectionReason: null, isActive: true, isVerified: true, verifiedAt: now, verifiedBy: g.user.id, ...(weekly != null ? { weeklyAmount: weekly } : {}), updatedAt: now } as never,
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) { return fail("driver-applications/approve", err); }
}
