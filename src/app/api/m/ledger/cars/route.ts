// GET /api/m/ledger/cars  (admin) — ledger grouped by car: income / expenses / net + the car's current driver.
// Totals are computed by the database (grouped sums), not by loading every ledger row — this stays fast with years of history.
// Rejected entries never count. Entries recorded for a driver without a car are attributed to the driver's current car;
// when a car is handed back those entries are pinned to the old car (see pinLedgerToCar) so history doesn't jump.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";

const NOT_REJECTED = { OR: [{ status: null }, { status: { not: "REJECTED" } }] };

type Agg = { income: number; expenses: number; count: number; last: Date | null };
const blank = (): Agg => ({ income: 0, expenses: 0, count: 0, last: null });
function add(a: Agg, direction: string, sum: unknown, count: number, last: Date | null) {
  if (direction === "CREDIT") a.income += Number(sum ?? 0); else a.expenses += Number(sum ?? 0);
  a.count += count;
  if (last && (!a.last || last > a.last)) a.last = last;
}

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const cars = await prisma.car.findMany({
      where: { deletedAt: null },
      select: {
        id: true, registration: true, make: true, model: true, status: true,
        driverprofile: { select: { id: true, weeklyAmount: true, user_driverprofile_userIdTouser: { select: { name: true } } } },
      },
      orderBy: { registration: "asc" },
    });

    const byCar = await prisma.ledger.groupBy({
      by: ["carId", "direction"], where: { carId: { not: null }, ...NOT_REJECTED } as never,
      _sum: { amount: true }, _count: { _all: true }, _max: { createdAt: true },
    }) as unknown as { carId: number; direction: string; _sum: { amount: unknown }; _count: { _all: number }; _max: { createdAt: Date | null } }[];

    const driverIds = cars.map((c) => (c as { driverprofile?: { id: number } | null }).driverprofile?.id).filter((x): x is number => x != null);
    const byDriver = driverIds.length ? await prisma.ledger.groupBy({
      by: ["driverId", "direction"], where: { carId: null, driverId: { in: driverIds }, ...NOT_REJECTED } as never,
      _sum: { amount: true }, _count: { _all: true }, _max: { createdAt: true },
    }) as unknown as { driverId: number; direction: string; _sum: { amount: unknown }; _count: { _all: number }; _max: { createdAt: Date | null } }[] : [];

    const carAgg = new Map<number, Agg>();
    for (const r of byCar) { const a = carAgg.get(r.carId) ?? blank(); add(a, r.direction, r._sum.amount, r._count._all, r._max.createdAt); carAgg.set(r.carId, a); }
    const drvAgg = new Map<number, Agg>();
    for (const r of byDriver) { const a = drvAgg.get(r.driverId) ?? blank(); add(a, r.direction, r._sum.amount, r._count._all, r._max.createdAt); drvAgg.set(r.driverId, a); }

    const data = cars.map((car) => {
      const dp = (car as { driverprofile?: { id: number; weeklyAmount: unknown; user_driverprofile_userIdTouser?: { name: string } } | null }).driverprofile;
      const t = blank();
      const c = carAgg.get(car.id); if (c) { t.income += c.income; t.expenses += c.expenses; t.count += c.count; t.last = c.last; }
      const d = dp ? drvAgg.get(dp.id) : undefined;
      if (d) { t.income += d.income; t.expenses += d.expenses; t.count += d.count; if (d.last && (!t.last || d.last > t.last)) t.last = d.last; }
      return {
        id: car.id,
        registration: car.registration,
        make: car.make,
        model: car.model,
        status: car.status,
        driverName: dp?.user_driverprofile_userIdTouser?.name ?? null,
        driverId: dp?.id ?? null,
        weeklyAmount: dp?.weeklyAmount != null ? Number(dp.weeklyAmount) : null,
        totalIncome: t.income,
        totalExpenses: t.expenses,
        netBalance: t.income - t.expenses,
        lastTransactionDate: t.last ? new Date(t.last).toISOString() : null,
        transactionCount: t.count,
      };
    });
    return NextResponse.json({ data });
  } catch (err) { return fail("ledger/cars", err); }
}
