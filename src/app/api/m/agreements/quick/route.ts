// POST /api/m/agreements/quick — one-call agreement creation (admin only).
//   { driverId, carId, type?, weeklyRate?, depositAmount?, startDate?, endDate?, swap?, send? }
// Pre-fills everything from the driver, car and their previous agreements. If the driver already
// has a car and `swap` is true, the old agreement is ended and the old car freed first.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, serializeAgreement, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";
import { buildHireContent, buildInsuranceContent, HIRE_TERMS_SHORT } from "../../../../../../lib/agreement-template";

const LIVE = ["DRAFT", "PENDING_SIGNATURE", "SIGNED"] as never[];
const HIRE_TYPES = ["HIRE_AGREEMENT", "RS_CAR_RENTAL"] as never[];
const day = (d: Date) => d.toISOString().split("T")[0];
// Stops a double-tap / retry from creating two agreements at the same moment (single Node process).
const inFlight = new Set<string>();

export async function POST(req: Request) {
  const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden; if (!g.ok) return g.res;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const lockKey = `${body.driverId}:${body.carId}`;
  if (inFlight.has(lockKey)) return NextResponse.json({ message: "Already working on this — please wait a moment" }, { status: 409 });
  inFlight.add(lockKey);
  try { return await handle(g as { ok: true; user: { id: number } }, body as Record<string, unknown>); }
  catch (err) { return fail("agreements/quick", err); }
  finally { inFlight.delete(lockKey); }
}

async function handle(g: { ok: true; user: { id: number } }, body: Record<string, unknown>) {
  {
    const driverId = Number(body.driverId); const carId = Number(body.carId);
    if (!driverId || !carId) return NextResponse.json({ message: "Choose a driver and a car" }, { status: 400 });
    const type = body.type === "RS_CAR_RENTAL" ? "RS_CAR_RENTAL" : body.type === "INSURANCE_CERTIFICATE" ? "INSURANCE_CERTIFICATE" : "HIRE_AGREEMENT";
    if (type === "INSURANCE_CERTIFICATE") return await insurance(g, body, driverId, carId);
    const rs = type === "RS_CAR_RENTAL";
    const swap = body.swap === true;

    const driver = await prisma.driverprofile.findUnique({ where: { id: driverId }, include: driverUserInclude });
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!driver || !car) return NextResponse.json({ message: "Driver or car not found" }, { status: 404 });
    const dp = driver as unknown as { id: number; userId: number; applicationStatus?: string | null; licenseNumber: string | null; licenseExpiry: Date | null; address: string | null; postcode: string | null; nationalInsuranceNumber: string | null; weeklyAmount: unknown; user_driverprofile_userIdTouser: { name: string } };
    if (dp.applicationStatus === "PENDING" || dp.applicationStatus === "REJECTED")
      return NextResponse.json({ message: "This driver has not been approved yet" }, { status: 400 });
    const c = car as unknown as { id: number; make: string; model: string; registration: string; bodyType: string | null; driverProfileId: number | null };

    // Car must not already belong to someone else.
    const carBusy = await prisma.agreement.findFirst({
      where: { carId, type: { in: HIRE_TYPES }, status: { in: LIVE }, NOT: { driverId } } as never,
      include: { driverprofile: { include: driverUserInclude } },
    });
    if (carBusy || (c.driverProfileId && c.driverProfileId !== driverId))
      return NextResponse.json({ message: `${c.registration} is already assigned to another driver`, code: "CAR_BUSY" }, { status: 409 });

    // Driver's current hire/rental agreements.
    const current = await prisma.agreement.findMany({
      where: { driverId, type: { in: HIRE_TYPES }, status: { in: LIVE } } as never,
      include: { car: { select: carBasicSelect } },
    }) as unknown as { id: number; carId: number | null; status: string; type: string; car?: { registration: string; make: string; model: string } | null }[];
    const same = current.find((a) => a.carId === carId);
    if (same) return NextResponse.json({ message: "This driver already has an agreement for this car", code: "ALREADY_EXISTS", agreementId: same.id }, { status: 409 });
    const others = current.filter((a) => a.carId !== carId);
    if (others.length && !swap) {
      const o = others[0];
      return NextResponse.json({
        message: "This driver already has a car", code: "NEEDS_SWAP", agreementId: o.id,
        currentCar: o.car ? `${o.car.registration} · ${o.car.make} ${o.car.model}` : undefined,
      }, { status: 409 });
    }

    const now = new Date();
    const released: number[] = [];

    // ── Pre-fill from previous agreements ──
    const last = await prisma.agreement.findFirst({ where: { driverId, type: { in: HIRE_TYPES } } as never, orderBy: { createdAt: "desc" }, select: { weeklyRate: true, depositAmount: true } });
    const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
    const weeklyRate = body.weeklyRate != null && body.weeklyRate !== "" && num(body.weeklyRate) != null
      ? num(body.weeklyRate)
      : Number(dp.weeklyAmount) > 0 ? Number(dp.weeklyAmount) : (last?.weeklyRate != null ? Number(last.weeklyRate) : null);
    const deposit = body.depositAmount != null && body.depositAmount !== "" && num(body.depositAmount) != null
      ? (num(body.depositAmount) as number) : (last?.depositAmount != null ? Number(last.depositAmount) : 0);
    const start = body.startDate ? new Date(String(body.startDate)) : now;
    const end = body.endDate ? new Date(String(body.endDate)) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    const name = dp.user_driverprofile_userIdTouser.name;

    const content = buildHireContent({
      rs, driverName: name, licenseNumber: dp.licenseNumber, licenseExpiry: dp.licenseExpiry ? day(dp.licenseExpiry) : "",
      address: dp.address, postcode: dp.postcode, nationalInsuranceNumber: dp.nationalInsuranceNumber,
      make: c.make, model: c.model, registration: c.registration, bodyType: c.bodyType,
      weeklyRate, deposit, startDate: day(start), endDate: day(end),
    });

    const send = body.send === true;
    const row = await prisma.agreement.create({
      data: {
        type: type as never, title: `${rs ? "RS Car Rental" : "Hire Agreement"} — ${c.registration} · ${name}`, content, terms: HIRE_TERMS_SHORT,
        driverId, carId, weeklyRate, depositAmount: deposit, startDate: start, endDate: end,
        status: (send ? "PENDING_SIGNATURE" : "DRAFT") as never, createdBy: g.user.id, updatedAt: now,
      } as never,
      include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } },
    });

    // Provisionally occupy the car for this driver, same as the normal create route.
    await prisma.car.update({ where: { id: carId }, data: { driverProfileId: driverId, status: "RESERVED" as never, ...(rs ? { RS_RENTAL: true } : { HIRE: true }), updatedAt: now } as never }).catch(() => {});
    await prisma.user.update({ where: { id: dp.userId }, data: rs ? { RS_RENTAL: true } : { HIRE: true } as never }).catch(() => {});

    // ── Swap: only now that the new agreement exists, end the old one(s) and free the old car(s) ──
    for (const old of others) {
      await prisma.agreement.update({
        where: { id: old.id },
        data: { status: (old.status === "DRAFT" ? "CANCELLED" : "TERMINATED") as never, isActive: false, terminatedAt: now, updatedAt: now } as never,
      });
      if (old.carId) {
        await prisma.car.update({ where: { id: old.carId }, data: { HIRE: false, RS_RENTAL: false, driverProfileId: null, status: "AVAILABLE", updatedAt: now } as never }).catch(() => {});
      }
      released.push(old.id);
      // An insurance certificate for the car being handed back no longer applies either.
      if (old.carId) {
        await prisma.agreement.updateMany({
          where: { driverId, carId: old.carId, type: "INSURANCE_CERTIFICATE", status: { in: ["DRAFT", "PENDING_SIGNATURE"] } } as never,
          data: { status: "CANCELLED" as never, isActive: false, updatedAt: now } as never,
        }).catch(() => {});
        await prisma.agreement.updateMany({
          where: { driverId, carId: old.carId, type: "INSURANCE_CERTIFICATE", status: "SIGNED" } as never,
          data: { status: "TERMINATED" as never, isActive: false, terminatedAt: now, updatedAt: now } as never,
        }).catch(() => {});
      }
    }
    if (released.length) {
      await prisma.notification.create({
        data: { type: "AGREEMENT_SIGNED" as never, title: "Car changed", message: "Your previous agreement has ended because you are being given a different car.", referenceType: "agreement", referenceId: released[0], isForAdmin: false, driverId, updatedAt: now } as never,
      }).catch(() => {});
    }

    if (send) {
      await prisma.notification.create({
        data: { type: "AGREEMENT_SIGNED" as never, title: "Agreement Ready to Sign", message: `Your agreement "${row.title}" is ready for your signature.`, referenceType: "agreement", referenceId: row.id, isForAdmin: false, driverId, updatedAt: now } as never,
      }).catch(() => {});
      const tokens = await getTokensForUsers([dp.userId]);
      await sendExpoPush(tokens, "Agreement Ready to Sign 📝", `"${row.title}" is waiting for your signature.`, { route: `/modals/agreement-detail?id=${row.id}` });
    }

    const missing: string[] = [];
    if (!dp.licenseNumber) missing.push("licence number");
    if (!dp.licenseExpiry) missing.push("licence expiry");
    if (!dp.address || !dp.postcode) missing.push("address");
    if (weeklyRate == null) missing.push("weekly rate");
    if (!c.bodyType) missing.push("body type");

    return NextResponse.json({ agreement: serializeAgreement(row as never), released, missing }, { status: 201 });
  }
}

// Insurance certificate: no swap logic (it can sit alongside a hire agreement). Policy number is copied
// from the driver's/car's previous certificate, or must be supplied.
async function insurance(g: { ok: true; user: { id: number } }, body: Record<string, unknown>, driverId: number, carId: number) {
  const driver = await prisma.driverprofile.findUnique({ where: { id: driverId }, include: driverUserInclude });
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!driver || !car) return NextResponse.json({ message: "Driver or car not found" }, { status: 404 });
  const dp = driver as unknown as { userId: number; applicationStatus?: string | null; licenseNumber: string | null; address: string | null; postcode: string | null; user_driverprofile_userIdTouser: { name: string } };
  if (dp.applicationStatus === "PENDING" || dp.applicationStatus === "REJECTED")
    return NextResponse.json({ message: "This driver has not been approved yet" }, { status: 400 });
  const c = car as unknown as { make: string; model: string; registration: string; driverProfileId: number | null };
  if (c.driverProfileId && c.driverProfileId !== driverId)
    return NextResponse.json({ message: `${c.registration} is already assigned to another driver`, code: "CAR_BUSY" }, { status: 409 });
  const same = await prisma.agreement.findFirst({ where: { driverId, carId, type: "INSURANCE_CERTIFICATE", status: { in: LIVE } } as never, select: { id: true } });
  if (same) return NextResponse.json({ message: "This driver already has an insurance certificate for this car", code: "ALREADY_EXISTS", agreementId: same.id }, { status: 409 });

  let policy = String(body.insuranceNumber ?? "").trim();
  if (!policy) {
    const prev = await prisma.agreement.findFirst({
      where: { type: "INSURANCE_CERTIFICATE", insuranceNumber: { not: null }, OR: [{ carId }, { driverId }] } as never,
      orderBy: { createdAt: "desc" }, select: { insuranceNumber: true },
    });
    policy = (prev?.insuranceNumber ?? "").trim();
  }
  if (!policy) return NextResponse.json({ message: "Enter the insurance policy number", code: "NEEDS_POLICY" }, { status: 400 });

  const now = new Date();
  const start = body.startDate ? new Date(String(body.startDate)) : now;
  const end = body.endDate ? new Date(String(body.endDate)) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
  const name = dp.user_driverprofile_userIdTouser.name;
  const send = body.send === true;
  const row = await prisma.agreement.create({
    data: {
      type: "INSURANCE_CERTIFICATE" as never, title: `Insurance Certificate — ${c.registration} · ${name}`,
      content: buildInsuranceContent({ vehicleReg: c.registration, makeModel: `${c.make} ${c.model}`.trim(), driverName: name, licenseNumber: dp.licenseNumber, address: [dp.address, dp.postcode].filter(Boolean).join(", "), startDate: day(start), endDate: day(end), policyNo: policy }),
      driverId, carId, insuranceNumber: policy, startDate: start, endDate: end,
      status: (send ? "PENDING_SIGNATURE" : "DRAFT") as never, createdBy: g.user.id, updatedAt: now,
    } as never,
    include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } },
  });
  await prisma.car.update({ where: { id: carId }, data: { driverProfileId: driverId, status: "RESERVED" as never, INSURANCE_C: true, updatedAt: now } as never }).catch(() => {});
  await prisma.user.update({ where: { id: dp.userId }, data: { INSURANCE_C: true } as never }).catch(() => {});
  if (send) {
    await prisma.notification.create({
      data: { type: "AGREEMENT_SIGNED" as never, title: "Agreement Ready to Sign", message: `Your agreement "${row.title}" is ready for your signature.`, referenceType: "agreement", referenceId: row.id, isForAdmin: false, driverId, updatedAt: now } as never,
    }).catch(() => {});
    const tokens = await getTokensForUsers([dp.userId]);
    await sendExpoPush(tokens, "Agreement Ready to Sign 📝", `"${row.title}" is waiting for your signature.`, { route: `/modals/agreement-detail?id=${row.id}` });
  }
  const missing: string[] = [];
  if (!dp.licenseNumber) missing.push("licence number");
  if (!dp.address) missing.push("address");
  return NextResponse.json({ agreement: serializeAgreement(row as never), released: [], missing }, { status: 201 });
}
