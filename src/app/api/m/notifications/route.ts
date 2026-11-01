import { NextResponse } from "next/server";
import { prisma, requireUser, serializeNotification, fail } from "../../../../../lib/mobile-api";
import { notificationRoute } from "../../../../../lib/notification-route";

async function mineWhere(userId: number, role: string) {
  const dp = await prisma.driverprofile.findUnique({ where: { userId } }).catch(() => null);
  const or: Record<string, unknown>[] = [{ userId }];
  if (role === "ADMIN") or.push({ isForAdmin: true });
  if (dp) or.push({ driverId: dp.id });
  return { OR: or };
}

// Returns an array (the app expects Notification[], not paginated). Each item carries `route`: the app screen it opens.
export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const isAdmin = g.user.role === "ADMIN";
    const rows = await prisma.notification.findMany({ where: (await mineWhere(g.user.id, g.user.role)) as never, orderBy: { createdAt: "desc" }, take: 50 });

    // Some admin notifications store a user id for the driver — map those to driver profile ids.
    const userIds = Array.from(new Set(rows.filter((r) => (r.referenceType || "").toLowerCase() === "driver" && r.referenceId != null).map((r) => r.referenceId as number)));
    const map = new Map<number, number>();
    if (isAdmin && userIds.length) {
      const dps = await prisma.driverprofile.findMany({ where: { userId: { in: userIds } }, select: { id: true, userId: true } });
      dps.forEach((d) => map.set(d.userId, d.id));
    }
    return NextResponse.json(rows.map((r) => serializeNotification(r as never, notificationRoute(r as never, isAdmin, map))));
  } catch (err) { return fail("notifications", err); }
}

// Clear all of my notifications.
export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const r = await prisma.notification.deleteMany({ where: (await mineWhere(g.user.id, g.user.role)) as never });
    return NextResponse.json({ success: true, deleted: r.count });
  } catch (err) { return fail("notifications DELETE", err); }
}
