import { NextResponse } from "next/server";
import { prisma, requireUser, fail } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id } }).catch(() => null);
    const or: Record<string, unknown>[] = [{ userId: g.user.id }];
    if (g.user.role === "ADMIN") or.push({ isForAdmin: true });
    if (dp) or.push({ driverId: dp.id });
    await prisma.notification.updateMany({ where: { OR: or, isRead: false }, data: { isRead: true, readAt: new Date(), updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (err) { return fail("notifications/read-all", err); }
}
