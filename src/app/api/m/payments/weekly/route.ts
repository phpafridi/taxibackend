import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, pageParams, paginated, qstr, qint, serializeWeeklyPayment, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { sp, page, limit, skip } = pageParams(req.url);
    const status = qstr(sp, "status");
    const driverId = qint(sp, "driverId");
    const where: Record<string, unknown> = {};
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); where.driverId = dpid ?? -1; }
    else if (driverId != null) where.driverId = driverId;
    if (status) where.status = status;
    const [total, rows] = await Promise.all([
      prisma.weeklypayment.count({ where }),
      prisma.weeklypayment.findMany({ where, orderBy: { weekStart: "desc" }, skip, take: limit }),
    ]);
    return NextResponse.json(paginated(rows.map(serializeWeeklyPayment as never), total, page, limit));
  } catch (err) { return fail("payments/weekly", err); }
}
