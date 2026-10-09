// GET /api/m/dashboard/stats  -> DashboardStats (scoped by role)
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, num, fail } from "../../../../../../lib/mobile-api";

async function safe<T>(p: Promise<T>, fb: T): Promise<T> { try { return await p; } catch { return fb; } }
const ZAGG = { _sum: { amount: 0 } } as never;

function startOfWeek(): Date {
  const d = new Date(); const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d;
}

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const weekStart = startOfWeek();
    const isAdmin = g.user.role === "ADMIN";

    // Driver scope: only their own car / payments / maintenance / agreement.
    const dpid = isAdmin ? null : await driverProfileIdFor(g.user.id);
    const carWhere = isAdmin ? { deletedAt: null } : { deletedAt: null, driverProfileId: dpid ?? -1 };
    const dWhere = (extra: Record<string, unknown> = {}) => (isAdmin ? extra : { ...extra, driverId: dpid ?? -1 });
    const dpWhere = isAdmin ? { deletedAt: null, AND: [{ OR: [{ applicationStatus: null }, { applicationStatus: "APPROVED" }] }] } : { deletedAt: null, id: dpid ?? -1 };

    const [
      carsTotal, carsAvailable, carsAssigned, carsMaintenance, carsRented,
      driversTotal, driversActive, driversVerified,
      payPending, payOverdue, paidAgg, outstandingAgg,
      mPending, mApproved, mApprovedAgg,
      licenseSoon, insuranceSoon, agreementSoon,
    ] = await Promise.all([
      safe(prisma.car.count({ where: carWhere }), 0),
      safe(prisma.car.count({ where: { ...carWhere, status: "AVAILABLE" } }), 0),
      safe(prisma.car.count({ where: { ...carWhere, status: { in: ["ASSIGNED","RENTED"] } } }), 0),
      safe(prisma.car.count({ where: { ...carWhere, status: "RENTED" } }), 0),
      safe(prisma.car.count({ where: { ...carWhere, status: "MAINTENANCE" } }), 0),

      safe(prisma.driverprofile.count({ where: dpWhere }), 0),
      safe(prisma.driverprofile.count({ where: { ...dpWhere, isActive: true } }), 0),
      safe(prisma.driverprofile.count({ where: { ...dpWhere, isVerified: true } }), 0),

      safe(prisma.ledger.count({ where: dWhere({ status: "PENDING", direction: "CREDIT" }) }), 0),
      safe(prisma.ledger.count({ where: dWhere({ status: "REJECTED", direction: "CREDIT" }) }), 0),
      safe(prisma.ledger.aggregate({ _sum: { amount: true }, where: dWhere({ status: "ACCEPT", direction: "CREDIT", category: "WEEKLY_INCOME", OR: [{ paymentDate: { gte: weekStart } }, { createdAt: { gte: weekStart } }] }) }), ZAGG),
      safe(prisma.ledger.aggregate({ _sum: { amount: true }, where: dWhere({ status: "ACCEPT", direction: "DEBIT", category: "WEEKLY_INCOME" }) }), ZAGG),

      safe(prisma.maintenancerequest.count({ where: dWhere({ status: "PENDING" }) }), 0),
      safe(prisma.maintenancerequest.count({ where: dWhere({ status: "APPROVED" }) }), 0),
      safe(prisma.maintenancerequest.aggregate({ _sum: { amount: true }, where: dWhere({ status: "APPROVED" }) }), ZAGG),

      safe(prisma.driverprofile.count({ where: { ...dpWhere, licenseExpiry: { gte: now, lte: in30 } } }), 0),
      safe(prisma.insurance.count({ where: isAdmin ? { isActive: true, endDate: { gte: now, lte: in30 } } : { isActive: true, endDate: { gte: now, lte: in30 }, driverId: dpid ?? -1 } }), 0),
      safe(prisma.agreement.count({ where: dWhere({ isActive: true, endDate: { gte: now, lte: in30 } }) }), 0),
    ]);

    const pendingApplications = isAdmin ? await safe(prisma.driverprofile.count({ where: { applicationStatus: "PENDING" } as never }), 0) : 0;

    return NextResponse.json({
      pendingApplications,
      cars: { total: carsTotal, available: carsAvailable, assigned: carsAssigned, maintenance: carsMaintenance },
      drivers: { total: driversTotal, active: driversActive, verified: driversVerified, unverified: Math.max(0, driversTotal - driversVerified) },
      payments: {
        weeklyIncome: num((paidAgg as { _sum: { amount: unknown } })._sum.amount),
        pendingPayments: payPending, pendingApprovals: payOverdue,
        totalOutstanding: num((outstandingAgg as { _sum: { amount: unknown } })._sum.amount),
      },
      maintenance: { pending: mPending, approved: mApproved, totalAmount: num((mApprovedAgg as { _sum: { amount: unknown } })._sum.amount) },
      expiryAlerts: { licenses: licenseSoon, insurance: insuranceSoon, agreements: agreementSoon },
    });
  } catch (err) { return fail("dashboard", err); }
}
