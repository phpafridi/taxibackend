import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, pageParams, paginated, qstr, qint, num, serializeLedger, fail, sendExpoPush, getTokensForUsers } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { sp, page, limit, skip } = pageParams(req.url, 50);
    const category = qstr(sp, "category");
    const direction = qstr(sp, "direction");
    const status = qstr(sp, "status");
    const carId = qint(sp, "carId");

    // Base scope (role + category) drives the Money In/Out/Net summary so it
    // reflects ALL entries, not just the current direction filter or page.
    const base: Record<string, unknown> = {};
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); base.driverId = dpid ?? -1; }
    if (category) base.category = category;
    if (carId != null) base.carId = carId;

    const listWhere: Record<string, unknown> = { ...base };
    if (direction) listWhere.direction = direction;
    if (status) listWhere.status = status;

    // Money totals ignore rejected entries (they never happened).
    const live = { OR: [{ status: null }, { status: { not: "REJECTED" } }] };
    const creditWhere: Record<string, unknown> = { ...base, direction: "CREDIT", ...live };
    const debitWhere: Record<string, unknown> = { ...base, direction: "DEBIT", ...live };

    const [total, rows, creditAgg, debitAgg] = await Promise.all([
      prisma.ledger.count({ where: listWhere }),
      prisma.ledger.findMany({
        where: listWhere, orderBy: { createdAt: "desc" }, skip, take: limit,
        include: { car: { select: { registration: true } }, driverprofile: { include: { user_driverprofile_userIdTouser: { select: { name: true } } } } },
      }),
      prisma.ledger.aggregate({ _sum: { amount: true }, where: creditWhere }),
      prisma.ledger.aggregate({ _sum: { amount: true }, where: debitWhere }),
    ]);
    const credit = num((creditAgg as { _sum: { amount: unknown } })._sum.amount);
    const debit = num((debitAgg as { _sum: { amount: unknown } })._sum.amount);

    // Which of these entries have a receipt photo (ids only — the images load on demand).
    const ids = (rows as { id: number }[]).map((r) => r.id);
    const withProof = new Set<number>(
      ids.length ? (await prisma.ledgerproof.findMany({ where: { ledgerId: { in: ids } }, select: { ledgerId: true } })).map((p: { ledgerId: number }) => p.ledgerId) : [],
    );
    const items = (rows as never[]).map((r) => ({ ...(serializeLedger as (x: never) => Record<string, unknown>)(r), hasProof: withProof.has((r as { id: number }).id) }));

    return NextResponse.json({
      ...paginated(items as never, total, page, limit),
      summary: { credit, debit, net: credit - debit },
    });
  } catch (err) { return fail("ledger", err); }
}


export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const category = body.category != null ? String(body.category) : "";
    const direction = body.direction != null ? String(body.direction) : "";
    const description = body.description != null ? String(body.description).trim() : "";
    const amount = Number(body.amount);

    if (!category || !direction || !description || !(amount > 0))
      return NextResponse.json({ message: "category, direction, amount and description are required" }, { status: 400 });
    if (direction !== "CREDIT" && direction !== "DEBIT")
      return NextResponse.json({ message: "Invalid direction" }, { status: 400 });

    const isAdmin = g.user.role === "ADMIN";

    let ownerType = "OWNER";
    let ownerId = 0;
    let driverId: number | null = null;
    let carId: number | null = body.carId != null && Number(body.carId) > 0 ? Number(body.carId) : null;
    let status = "ACCEPT";
    const computeBalance = isAdmin;

    if (!isAdmin) {
      // Driver records a payment -> PENDING until an admin accepts it.
      const dpid = await driverProfileIdFor(g.user.id);
      if (!dpid) return NextResponse.json({ message: "Driver profile not found" }, { status: 404 });
      ownerType = "DRIVER"; ownerId = dpid; driverId = dpid; status = "PENDING";
      if (carId == null) {
        const car = await prisma.car.findFirst({ where: { driverProfileId: dpid, isActive: true } as never, select: { id: true } });
        carId = car?.id ?? null;
      }
    } else {
      // Admin can record against a driver (resolve profile) or the business (OWNER).
      const drvId = body.driverId != null && Number(body.driverId) > 0 ? Number(body.driverId) : null;
      if (drvId) {
        const dp = await prisma.driverprofile.findUnique({ where: { id: drvId }, select: { id: true } });
        if (!dp) return NextResponse.json({ message: "Driver profile not found" }, { status: 404 });
        ownerType = "DRIVER"; ownerId = dp.id; driverId = dp.id;
      } else if (carId != null) {
        const car = await prisma.car.findUnique({ where: { id: carId }, select: { driverProfileId: true } });
        if (car?.driverProfileId) { ownerType = "DRIVER"; ownerId = car.driverProfileId; driverId = car.driverProfileId; }
        else { ownerType = "OWNER"; ownerId = g.user.id; }
      } else {
        ownerType = "OWNER"; ownerId = g.user.id;
      }
      status = body.status != null ? String(body.status) : "ACCEPT";
    }

    // Validate car if set.
    if (carId != null) {
      const carExists = await prisma.car.findUnique({ where: { id: carId }, select: { id: true } });
      if (!carExists) return NextResponse.json({ message: `Car not found with ID: ${carId}` }, { status: 404 });
    }

    let balanceBefore: number | null = null;
    let balanceAfter: number | null = null;
    if (computeBalance) {
      const prev = await prisma.ledger.findFirst({ where: { ownerType: ownerType as never, ownerId }, orderBy: { createdAt: "desc" }, select: { balanceAfter: true } });
      balanceBefore = prev?.balanceAfter != null ? Number(prev.balanceAfter) : 0;
      balanceAfter = direction === "CREDIT" ? balanceBefore + amount : balanceBefore - amount;
    }

    const row = await prisma.ledger.create({
      data: {
        ownerType: ownerType as never,
        ownerId,
        category: category as never,
        direction: direction as never,
        amount,
        description,
        carId,
        driverId,
        paymentMethod: body.paymentMethod != null ? String(body.paymentMethod) : "CASH",
        paymentDate: body.paymentDate ? new Date(String(body.paymentDate)) : new Date(),
        balanceBefore: balanceBefore as never,
        balanceAfter: balanceAfter as never,
        createdBy: g.user.id,
        status: status as never,
        updatedAt: new Date(),
      },
    });

    // Optional receipt photo (compressed JPEG data-URI from the app).
    let hasProof = false;
    const proof = typeof body.proofImage === "string" ? body.proofImage : "";
    if (proof && proof.startsWith("data:image/") && proof.length < 3_000_000) {
      try { await prisma.ledgerproof.create({ data: { ledgerId: row.id, image: proof } }); hasProof = true; } catch { /* proof is best-effort */ }
    }

    // Notify admins when a driver submits a payment for approval.
    if (!isAdmin) {
      try {
        const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
        await Promise.all(admins.map((a) => prisma.notification.create({
          data: {
            type: "WEEKLY_PAYMENT_PAID" as never, title: "WEEKLY PAYMENT PENDING",
            message: "A driver submitted a payment awaiting your approval.",
            isForAdmin: true, userId: a.id, driverId: driverId ?? undefined,
            referenceType: "LEDGER_ENTRY", referenceId: row.id, updatedAt: new Date(),
          } as never,
        })));
        // Send push to admins
        try {
          const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" as never }, select: { id: true } });
          const tokens = await getTokensForUsers(adminUsers.map(a => a.id));
          const dp = driverId ? await prisma.driverprofile.findUnique({ where: { id: driverId }, include: { user_driverprofile_userIdTouser: { select: { name: true } } } }) : null;
          const driverName = (dp as any)?.user_driverprofile_userIdTouser?.name ?? "A driver";
          await sendExpoPush(tokens, "Payment Submitted 💰", `${driverName} submitted a payment for approval${hasProof ? " (receipt attached)" : ""}.`, { route: "/ledger" });
        } catch { /* push is best-effort */ }
      } catch { /* notifications are best-effort */ }
    }

    return NextResponse.json({ ...serializeLedger(row as never), hasProof }, { status: 201 });
  } catch (err) { return fail("ledger", err); }
}
