// GET /api/m/ledger/cars  (admin) — ledger grouped by car, mirrors the web's
// /api/ledger/aggregated/cars: each car with income/expenses/net + its driver.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const cars = await prisma.car.findMany({
      where: { deletedAt: null },
      include: {
        driverprofile: { include: { user_driverprofile_userIdTouser: { select: { name: true } } } },
        ledger: true,
      },
      orderBy: { registration: "asc" },
    });
    // Some ledger entries are linked only by driverId (carId left null when recorded).
    // Pull those too, per driver, so totals on the cars summary match the driver's own ledger.
    const driverIds = cars.map((c) => (c as { driverprofile?: { id: number } }).driverprofile?.id).filter((x): x is number => x != null);
    const byDriverLedger = driverIds.length
      ? await prisma.ledger.findMany({ where: { driverId: { in: driverIds }, carId: null } })
      : [];
    const data = cars.map((car) => {
      const dpId = (car as { driverprofile?: { id: number } }).driverprofile?.id;
      const carEntries = ((car as { ledger?: { direction: string; amount: unknown; createdAt: Date }[] }).ledger) || [];
      const extraEntries = dpId != null ? byDriverLedger.filter((l) => l.driverId === dpId) : [];
      const entries = [...carEntries, ...extraEntries];
      const totalIncome = entries.filter((l) => l.direction === "CREDIT").reduce((s, l) => s + Number(l.amount), 0);
      const totalExpenses = entries.filter((l) => l.direction === "DEBIT").reduce((s, l) => s + Number(l.amount), 0);
      const last = entries.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const dp = (car as { driverprofile?: { id: number; weeklyAmount: unknown; user_driverprofile_userIdTouser?: { name: string } } }).driverprofile;
      return {
        id: car.id,
        registration: car.registration,
        make: car.make,
        model: car.model,
        status: car.status,
        driverName: dp?.user_driverprofile_userIdTouser?.name ?? null,
        driverId: dp?.id ?? null,
        weeklyAmount: dp?.weeklyAmount != null ? Number(dp.weeklyAmount) : null,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        lastTransactionDate: last?.createdAt ? new Date(last.createdAt).toISOString() : null,
        transactionCount: entries.length,
      };
    });
    return NextResponse.json({ data });
  } catch (err) { return fail("ledger/cars", err); }
}
