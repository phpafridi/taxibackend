// src/app/api/m/driver-location/trackable/route.ts
// GET /api/m/driver-location/trackable — ADMIN ONLY
// Returns every driver who currently has an active (SIGNED) HIRE_AGREEMENT,
// along with their last reported location if one exists. A driver with no
// driverlocation row yet (never opened the app / never granted location)
// is still listed, just with location: null, so admin can see who SHOULD
// be trackable but isn't reporting yet.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail, driverUserInclude, carBasicSelect } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;

    const drivers = await prisma.driverprofile.findMany({
      where: {
        isActive: true,
        agreement: { some: { type: "HIRE_AGREEMENT" as never, status: "SIGNED" as never } },
      },
      include: {
        ...driverUserInclude,
        driverlocation: true,
        car: { select: carBasicSelect },
      },
      orderBy: { id: "asc" },
    });

    const data = drivers.map((d: any) => ({
      id: d.id,
      name: d.user_driverprofile_userIdTouser?.name ?? "Unknown",
      avatar: d.user_driverprofile_userIdTouser?.avatar ?? null,
      car: d.car?.[0] ?? null,
      location: d.driverlocation
        ? {
            latitude: d.driverlocation.latitude,
            longitude: d.driverlocation.longitude,
            accuracy: d.driverlocation.accuracy,
            gpsEnabled: d.driverlocation.gpsEnabled,
            isTracked: d.driverlocation.isTracked,
            recordedAt: d.driverlocation.recordedAt,
            updatedAt: d.driverlocation.updatedAt,
          }
        : null,
    }));

    return NextResponse.json({ data });
  } catch (err) { return fail("driver-location/trackable", err); }
}
