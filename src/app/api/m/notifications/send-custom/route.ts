// src/app/api/m/notifications/send-custom/route.ts
// POST /api/m/notifications/send-custom — ADMIN ONLY
// Send a custom push notification (+ in-app notification row) to one driver
// or to every active driver. This is the mobile equivalent of the web's
// admin "Send Notification" tool.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const body = await req.json().catch(() => ({}));

    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    const driverId: number | "all" = body.driverId === "all" ? "all" : Number(body.driverId);

    if (!title || !message) {
      return NextResponse.json({ message: "Title and message are required" }, { status: 400 });
    }
    if (driverId !== "all" && !Number.isFinite(driverId)) {
      return NextResponse.json({ message: "A driver must be selected" }, { status: 400 });
    }

    // Resolve the target driver profile(s) — only active drivers, matching
    // the picker the admin actually sees on screen.
    const drivers = await prisma.driverprofile.findMany({
      where: {
        isActive: true,
        ...(driverId === "all" ? {} : { id: driverId }),
      },
      select: { id: true, userId: true },
    });

    if (!drivers.length) {
      return NextResponse.json({ message: "No matching driver found" }, { status: 404 });
    }

    const now = new Date();

    // 1. Write a real `notification` row per driver so it shows in their
    //    in-app notification bell even if push delivery fails/is delayed.
    await prisma.notification.createMany({
      data: drivers.map((d: { id: number }) => ({
        type: "SYSTEM" as never,
        title,
        message,
        isForAdmin: false,
        driverId: d.id,
        updatedAt: now,
      })),
    });

    // 2. Send the actual push to every driver's registered device(s).
    const userIds = drivers.map((d: { userId: number }) => d.userId);
    const tokens = await getTokensForUsers(userIds);
    await sendExpoPush(tokens, title, message, { route: "/modals/notifications" });

    return NextResponse.json({
      success: true,
      driversNotified: drivers.length,
      pushTokensReached: tokens.length,
    });
  } catch (err) { return fail("notifications/send-custom", err); }
}
