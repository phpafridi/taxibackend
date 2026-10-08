// GET /api/m/dashboard/expiring — the actual items behind the dashboard expiry counts
// (licences expiring, agreements expiring, insurance expiring), scoped by role.
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isAdmin = g.user.role === "ADMIN";
    const dpid = isAdmin ? null : await driverProfileIdFor(g.user.id);

    const [licences, agreements, insurance] = await Promise.all([
      prisma.driverprofile.findMany({
        where: {
          deletedAt: null,
          licenseExpiry: { gte: now, lte: in30 },
          ...(isAdmin ? {} : { id: dpid ?? -1 }),
        },
        include: { user_driverprofile_userIdTouser: { select: { id: true, name: true } } },
        orderBy: { licenseExpiry: "asc" },
      }),
      prisma.agreement.findMany({
        where: {
          isActive: true,
          endDate: { gte: now, lte: in30 },
          ...(isAdmin ? {} : { driverId: dpid ?? -1 }),
        },
        include: {
          car: { select: { registration: true } },
          driverprofile: { include: { user_driverprofile_userIdTouser: { select: { name: true } } } },
        },
        orderBy: { endDate: "asc" },
      }),
      prisma.insurance.findMany({
        where: {
          isActive: true,
          endDate: { gte: now, lte: in30 },
          ...(isAdmin ? {} : { driverId: dpid ?? -1 }),
        },
        include: { driverprofile: { include: { user_driverprofile_userIdTouser: { select: { name: true } } } } },
        orderBy: { endDate: "asc" },
      }),
    ]);

    return NextResponse.json({
      licences: licences.map((d) => ({
        driverId: d.id,
        driverName: (d as any).user_driverprofile_userIdTouser?.name ?? "Driver",
        licenseExpiry: d.licenseExpiry,
      })),
      agreements: agreements.map((a) => ({
        agreementId: a.id,
        title: (a as any).title,
        carRegistration: (a as any).car?.registration ?? null,
        driverName: (a as any).driverprofile?.user_driverprofile_userIdTouser?.name ?? null,
        endDate: a.endDate,
      })),
      insurance: insurance.map((i) => ({
        insuranceId: i.id,
        driverName: (i as any).driverprofile?.user_driverprofile_userIdTouser?.name ?? null,
        endDate: i.endDate,
      })),
    });
  } catch (err) { return fail("dashboard/expiring", err); }
}
