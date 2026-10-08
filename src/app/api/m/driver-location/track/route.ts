// src/app/api/m/driver-location/track/route.ts
// PATCH /api/m/driver-location/track
// Admin toggles isTracked on/off for a specific driver.
// When enabled, the driver app starts reporting every 30s.
// When tracking is switched ON the driver gets a push asking them to open the app and
// allow location (the app then shows its own permission sheet).
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";
import { emitRealtime } from "../../../../../../lib/realtime";

export async function PATCH(req: Request) {
  try {
    const g = await requireUser(req);
    const forbidden = requireAdmin(g);
    if (forbidden) return forbidden;

    const body = await req.json().catch(() => ({}));
    const driverId = Number(body.driverId);
    const isTracked = Boolean(body.isTracked);

    if (!driverId || isNaN(driverId)) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    // Check driver exists
    const driver = await prisma.driverprofile.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const now = new Date();

    // Upsert driverlocation row with isTracked flag
    await prisma.driverlocation.upsert({
      where: { driverId },
      update: { isTracked, updatedAt: now },
      create: {
        driverId,
        latitude: 0,
        longitude: 0,
        gpsEnabled: false,
        isTracked,
        recordedAt: now,
        updatedAt: now,
      },
    });

    console.log(`[track] Admin set isTracked=${isTracked} for driverId=${driverId}`);

    // Push straight to this driver's device — no more 30s polling needed
    // for them to find out tracking was toggled on/off.
    emitRealtime("tracking-status-changed", { isTracked }, { toUserId: driver.userId });

    // Also send a real push so a driver whose app is closed finds out and can allow location.
    if (isTracked) {
      try {
        const tokens = await getTokensForUsers([driver.userId]);
        await sendExpoPush(
          tokens,
          "Location needed",
          "Your fleet manager is checking your car. Open the app and allow location.",
          { type: "LOCATION_REQUEST" }
        );
      } catch (e) {
        console.error("[track] push failed", e);
      }
    }

    return NextResponse.json({ success: true, driverId, isTracked });
  } catch (err) {
    return fail("driver-location/track", err);
  }
}
