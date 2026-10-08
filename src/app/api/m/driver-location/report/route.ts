// src/app/api/m/driver-location/report/route.ts
// POST /api/m/driver-location/report — DRIVER ONLY
// Called periodically by the driver's app while they have an active hire
// agreement. Upserts a single row per driver (latest fix only — we don't
// need history for this feature, just "where are they right now").
//
// Two distinct shapes:
//   { latitude, longitude, accuracy? }   -> a real GPS fix
//   { gpsEnabled: false }                -> driver's GPS/location is off;
//                                           we keep the last known coordinates
//                                           but flag gpsEnabled=false so the
//                                           admin sees "GPS off" instead of
//                                           a misleadingly fresh-looking pin.
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    if (g.user.role === "ADMIN") {
      return NextResponse.json({ message: "Only drivers report location" }, { status: 403 });
    }
    const driverId = await driverProfileIdFor(g.user.id);
    if (!driverId) return NextResponse.json({ message: "Driver profile not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const now = new Date();

    if (body.gpsEnabled === false) {
      // GPS/location permission turned off on the device. Don't touch
      // lat/lng — keep the last known fix for context — just flag it.
      const existing = await prisma.driverlocation.findUnique({ where: { driverId } });
      if (existing) {
        await prisma.driverlocation.update({
          where: { driverId },
          data: { gpsEnabled: false, updatedAt: now },
        });
      } else {
        // No prior fix at all and GPS is off — nothing meaningful to store
        // yet, but record the state so admin's "GPS off" check still works.
        await prisma.driverlocation.create({
          data: { driverId, latitude: 0, longitude: 0, gpsEnabled: false, recordedAt: now, updatedAt: now },
        });
      }
      return NextResponse.json({ success: true, gpsEnabled: false });
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracy = body.accuracy != null ? Number(body.accuracy) : undefined;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ message: "latitude and longitude are required" }, { status: 400 });
    }

    await prisma.driverlocation.upsert({
      where: { driverId },
      update: { latitude, longitude, accuracy, gpsEnabled: true, recordedAt: now, updatedAt: now },
      create: { driverId, latitude, longitude, accuracy, gpsEnabled: true, recordedAt: now, updatedAt: now },
    });

    return NextResponse.json({ success: true, gpsEnabled: true });
  } catch (err) { return fail("driver-location/report", err); }
}
