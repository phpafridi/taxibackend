// POST /api/m/driver-applications/:id/reject  { reason? } — admin only.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const dp = await prisma.driverprofile.findUnique({ where: { id: Number(id) } });
    if (!dp) return NextResponse.json({ message: "Application not found" }, { status: 404 });
    if ((dp as unknown as { applicationStatus?: string | null }).applicationStatus !== "PENDING")
      return NextResponse.json({ message: "This application is not waiting for review" }, { status: 400 });
    const reason = body.reason != null ? String(body.reason).trim().slice(0, 500) : "";
    await prisma.driverprofile.update({
      where: { id: dp.id },
      data: { applicationStatus: "REJECTED", rejectionReason: reason || null, isActive: false, isVerified: false, updatedAt: new Date() } as never,
    });
    return NextResponse.json({ ok: true });
  } catch (err) { return fail("driver-applications/reject", err); }
}
