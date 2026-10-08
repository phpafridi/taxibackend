import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const platform = String(body.platform || "android");
    if (!token) return NextResponse.json({ success: false, message: "No token" }, { status: 400 });

    // Get driverProfileId if user is a driver
    let driverId: number | null = null;
    if (g.user.role !== "ADMIN") {
      driverId = await driverProfileIdFor(g.user.id);
    }

    // Upsert the token
    await prisma.fcmToken.upsert({
      where: { token },
      update: { userId: g.user.id, driverId, platform, updatedAt: new Date() },
      create: { token, userId: g.user.id, driverId, platform },
    });

    return NextResponse.json({ success: true });
  } catch (err) { return fail("notifications/fcm-token", err); }
}
