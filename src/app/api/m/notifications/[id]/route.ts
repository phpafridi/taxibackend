import { NextResponse } from "next/server";
import { prisma, requireUser, fail } from "../../../../../../lib/mobile-api";

// Delete one of my notifications.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id } }).catch(() => null);
    const or: Record<string, unknown>[] = [{ userId: g.user.id }];
    if (g.user.role === "ADMIN") or.push({ isForAdmin: true });
    if (dp) or.push({ driverId: dp.id });
    await prisma.notification.deleteMany({ where: { id: Number(id), OR: or } as never });
    return NextResponse.json({ success: true });
  } catch (err) { return fail("notifications/[id] DELETE", err); }
}
