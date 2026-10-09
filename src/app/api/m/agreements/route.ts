import { NextResponse } from "next/server";
import { writeBackAgreementDetails } from "../../../../../lib/agreement-helpers";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, pageParams, paginated, qstr, serializeAgreement, driverUserInclude, carBasicSelect, fail } from "../../../../../lib/mobile-api";

const inc = { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } };

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { sp, page, limit, skip } = pageParams(req.url);
    const type = qstr(sp, "type");
    const status = qstr(sp, "status");
    const where: Record<string, unknown> = {};
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); where.driverId = dpid ?? -1; }
    if (type) where.type = type;
    if (status) where.status = status;
    const [total, rows] = await Promise.all([
      prisma.agreement.count({ where }),
      prisma.agreement.findMany({ where, include: inc, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return NextResponse.json(paginated(rows.map(serializeAgreement as never), total, page, limit));
  } catch (err) { return fail("agreements", err); }
}

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const body = await req.json().catch(() => ({}));
    if (!body.type || !body.title || !body.content) return NextResponse.json({ message: "type, title and content are required" }, { status: 400 });
    const type = String(body.type);
    const driverId = body.driverId != null ? Number(body.driverId) : null;
    const carId = body.carId != null ? Number(body.carId) : null;

    const row = await prisma.agreement.create({
      data: {
        type: type as never, title: String(body.title), content: String(body.content),
        driverId, carId,
        weeklyRate: body.weeklyRate != null ? Number(body.weeklyRate) : null,
        depositAmount: body.depositAmount != null ? Number(body.depositAmount) : null,
        startDate: body.startDate ? new Date(String(body.startDate)) : null,
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
        dateIn: body.dateIn ? new Date(String(body.dateIn)) : null,
        terms: body.terms != null ? String(body.terms) : null,
        insuranceNumber: body.insuranceNumber != null ? String(body.insuranceNumber) : null,
        damageInScratch: !!body.damageInScratch, damageInDent: !!body.damageInDent, damageInChip: !!body.damageInChip,
        damageInMissing: !!body.damageInMissing, damageInMajorDamage: !!body.damageInMajorDamage,
        damageInNotes: body.damageInNotes != null ? String(body.damageInNotes) : null,
        damageOutScratch: !!body.damageOutScratch, damageOutDent: !!body.damageOutDent, damageOutChip: !!body.damageOutChip,
        damageOutMissing: !!body.damageOutMissing, damageOutMajorDamage: !!body.damageOutMajorDamage,
        damageOutNotes: body.damageOutNotes != null ? String(body.damageOutNotes) : null,
        // New agreements must start as DRAFT — admin reviews and explicitly
        // sends to the driver (DRAFT -> PENDING_SIGNATURE via the send action).
        // Without this, omitting `status` would fall back to the schema's
        // own default (PENDING_SIGNATURE), skipping the draft review step
        // and notifying/signing the driver immediately on creation.
        status: body.status ? (String(body.status) as never) : ("DRAFT" as never),
        createdBy: g.ok ? g.user.id : null, updatedAt: new Date(),
      },
      include: inc,
    });

    await writeBackAgreementDetails(driverId, carId, body);

    // Mark the car/driver as provisionally occupied by this draft, same as
    // the web dashboard does on create — keeps mobile-created agreements
    // consistent with web-created ones from the very first save, not just
    // once signed. Mirrors src/app/(auth-api)/api/agreements/route.ts.
    if (carId && driverId) {
      const now = new Date();
      const driver = await prisma.driverprofile.findUnique({ where: { id: driverId }, select: { userId: true } });

      if (type === "HIRE_AGREEMENT") {
        await prisma.car.update({ where: { id: carId }, data: { driverProfileId: driverId, status: "RESERVED" as never, HIRE: true, updatedAt: now } }).catch(() => {});
        if (driver) await prisma.user.update({ where: { id: driver.userId }, data: { HIRE: true } }).catch(() => {});
      } else if (type === "RS_CAR_RENTAL") {
        await prisma.car.update({ where: { id: carId }, data: { driverProfileId: driverId, status: "RESERVED" as never, RS_RENTAL: true, updatedAt: now } }).catch(() => {});
        if (driver) await prisma.user.update({ where: { id: driver.userId }, data: { RS_RENTAL: true } }).catch(() => {});
        // Persist the National Insurance Number on the driver profile so it
        // appears on the generated RS Car Rental PDF.
        if (body.nationalInsuranceNumber) {
          await prisma.driverprofile.update({ where: { id: driverId }, data: { nationalInsuranceNumber: String(body.nationalInsuranceNumber) } }).catch(() => {});
        }
      } else if (type === "INSURANCE_CERTIFICATE") {
        await prisma.car.update({ where: { id: carId }, data: { driverProfileId: driverId, status: "RESERVED" as never, INSURANCE_C: true, updatedAt: now } }).catch(() => {});
        if (driver) await prisma.user.update({ where: { id: driver.userId }, data: { INSURANCE_C: true } }).catch(() => {});
      }
    }

    return NextResponse.json(serializeAgreement(row as never), { status: 201 });
  } catch (err) { return fail("agreements", err); }
}
