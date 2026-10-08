// src/app/api/m/driver-location/tracking-status/route.ts
// GET /api/m/driver-location/tracking-status
// Driver polls this to know if admin is currently tracking them.
// Returns { isTracked: boolean } — no other info to prevent driver knowing more than needed.
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req);
    if (!g.ok) return g.res;

    if (g.user.role === "ADMIN") {
      return NextResponse.json({ isTracked: false });
    }

    const driverId = await driverProfileIdFor(g.user.id);
    if (!driverId) return NextResponse.json({ isTracked: false });

    const loc = await prisma.driverlocation.findUnique({
      where: { driverId },
      select: { isTracked: true, gpsEnabled: true },
    });

    return NextResponse.json({
      isTracked: loc?.isTracked ?? false,
    });
  } catch (err) {
    return fail("driver-location/tracking-status", err);
  }
}
