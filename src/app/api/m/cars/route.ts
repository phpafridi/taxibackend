import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, pageParams, paginated, qstr, serializeCar, driverUserInclude, fail } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { sp, page, limit, skip } = pageParams(req.url);
    const search = qstr(sp, "search");
    const status = qstr(sp, "status");
    const isActive = qstr(sp, "isActive");
    const eligibleForAgreement = qstr(sp, "eligibleForAgreement");
    const where: Record<string, unknown> = { deletedAt: null };
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); where.driverProfileId = dpid ?? -1; }
    if (search) where.OR = [
      { registration: { contains: search } },
      { make: { contains: search } },
      { model: { contains: search } },
    ];
    if (status) where.status = status;
    if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";
    // Used by the "New Agreement" picker — for a HIRE_AGREEMENT or
    // RS_CAR_RENTAL the car must be AVAILABLE (idle, not already assigned
    // to a driver) — both occupy the car the same way, so an active one of
    // EITHER type blocks a new one of EITHER type. An insurance certificate
    // has no such requirement — a car currently out on hire can still get an
    // insurance certificate. A car whose only agreements are expired,
    // terminated or cancelled is eligible again.
    if (eligibleForAgreement === "true") {
      const agreementType = qstr(sp, "agreementType");
      const conflictingTypes =
        agreementType === "HIRE_AGREEMENT" || agreementType === "RS_CAR_RENTAL"
          ? ["HIRE_AGREEMENT", "RS_CAR_RENTAL"]
          : agreementType
          ? [agreementType]
          : null;
      if (!agreementType || agreementType === "HIRE_AGREEMENT" || agreementType === "RS_CAR_RENTAL") {
        where.status = "AVAILABLE";
      }
      where.agreement = {
        none: {
          status: { in: ["DRAFT", "PENDING_SIGNATURE", "SIGNED"] },
          ...(conflictingTypes ? { type: { in: conflictingTypes as never[] } } : {}),
        },
      };
    }
    const [total, cars] = await Promise.all([
      prisma.car.count({ where }),
      prisma.car.findMany({ where, include: { driverprofile: { include: driverUserInclude } }, omit: { avatar: true }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    const isAdm = g.user.role === "ADMIN";
    return NextResponse.json(paginated(cars.map((c) => { const o = serializeCar(c as never) as Record<string, unknown>; if (!isAdm) { delete o.purchasePrice; delete o.currentValue; } return o; }) as never[], total, page, limit));
  } catch (err) { return fail("cars", err); }
}

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const body = await req.json().catch(() => ({}));
    if (!body.registration || !body.make || !body.model) return NextResponse.json({ message: "registration, make and model are required" }, { status: 400 });
    const car = await prisma.car.create({
      data: {
        registration: String(body.registration), make: String(body.make), model: String(body.model),
        year: body.year != null ? Number(body.year) : null,
        color: body.color != null ? String(body.color) : null,
        bodyType: body.bodyType != null ? String(body.bodyType) : null,
        avatar: body.avatar ? String(body.avatar) : null,
        purchasePrice: body.purchasePrice != null ? Number(body.purchasePrice) : 0,
        currentValue: body.currentValue != null ? Number(body.currentValue) : null,
        purchaseDate: body.purchaseDate ? new Date(String(body.purchaseDate)) : null,
        status: body.status ? String(body.status) : "AVAILABLE",
        isActive: body.isActive != null ? Boolean(body.isActive) : true,
        HIRE: Boolean(body.HIRE), INSURANCE_C: Boolean(body.INSURANCE_C), updatedAt: new Date(),
      },
      include: { driverprofile: { include: driverUserInclude } }, omit: { avatar: true },
    });
    return NextResponse.json(serializeCar(car as never), { status: 201 });
  } catch (err) { return fail("cars", err); }
}
