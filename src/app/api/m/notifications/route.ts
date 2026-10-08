import { NextResponse } from "next/server";
import { prisma, requireUser, serializeNotification, fail } from "../../../../../lib/mobile-api";

// Returns an array (the app expects Notification[], not paginated).
export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id } }).catch(() => null);
    const or: Record<string, unknown>[] = [{ userId: g.user.id }];
    if (g.user.role === "ADMIN") or.push({ isForAdmin: true });
    if (dp) or.push({ driverId: dp.id });
    const rows = await prisma.notification.findMany({ where: { OR: or }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json(rows.map(serializeNotification as never));
  } catch (err) { return fail("notifications", err); }
}
