import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, serializeAgreement, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../../../lib/mobile-api";
import { pinLedgerToCar } from "../../../../../../../lib/agreement-helpers";

// When the car goes back to the pool, an insurance certificate for that driver + car no longer applies.
async function endInsuranceFor(driverId: number, carId: number, now: Date) {
  await pinLedgerToCar(prisma, driverId, carId);
  await prisma.agreement.updateMany({
    where: { driverId, carId, type: "INSURANCE_CERTIFICATE", status: { in: ["DRAFT", "PENDING_SIGNATURE"] } } as never,
    data: { status: "CANCELLED" as never, isActive: false, updatedAt: now } as never,
  }).catch(() => {});
  await prisma.agreement.updateMany({
    where: { driverId, carId, type: "INSURANCE_CERTIFICATE", status: "SIGNED" } as never,
    data: { status: "TERMINATED" as never, isActive: false, terminatedAt: now, updatedAt: now } as never,
  }).catch(() => {});
  await prisma.car.update({ where: { id: carId }, data: { INSURANCE_C: false, updatedAt: now } as never }).catch(() => {});
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const adminErr = requireAdmin(g); if (adminErr) return adminErr;
    const { id } = await params;
    const agreementId = Number(id);

    const existing = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { driverprofile: true } });
    if (!existing) return NextResponse.json({ message: "Agreement not found" }, { status: 404 });
    const ex = existing as unknown as { status: string; type: string; carId: number | null; driverId: number | null; title: string; driverprofile: { userId: number } | null };
    if (!["SIGNED", "PENDING_SIGNATURE"].includes(ex.status))
      return NextResponse.json({ message: `Only SIGNED or PENDING_SIGNATURE agreements can be terminated (current: ${ex.status})` }, { status: 400 });

    const now = new Date();
    const updated = await prisma.agreement.update({
      where: { id: agreementId },
      data: { status: "TERMINATED" as never, isActive: false, updatedAt: now } as never,
      include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } },
    });

    if (ex.carId && ex.driverId) {
      if (ex.type === "HIRE_AGREEMENT") {
        const others = await prisma.agreement.findMany({ where: { id: { not: agreementId }, type: "HIRE_AGREEMENT" as never, carId: ex.carId, driverId: ex.driverId, isActive: true, status: "SIGNED" as never } as never });
        if (others.length === 0) {
          await prisma.car.update({ where: { id: ex.carId }, data: { HIRE: false, driverProfileId: null, status: "AVAILABLE", updatedAt: now } as never });
          await endInsuranceFor(ex.driverId, ex.carId, now);
          await prisma.driverprofile.update({ where: { id: ex.driverId }, data: { agreementSigned: false } as never }).catch(() => {});
          if (ex.driverprofile?.userId) await prisma.user.update({ where: { id: ex.driverprofile.userId }, data: { HIRE: false, updatedAt: now } as never }).catch(() => {});
        }
      } else if (ex.type === "INSURANCE_CERTIFICATE") {
        const others = await prisma.agreement.findMany({ where: { id: { not: agreementId }, type: "INSURANCE_CERTIFICATE" as never, carId: ex.carId, driverId: ex.driverId, isActive: true, status: "SIGNED" as never } as never });
        if (others.length === 0) {
          await prisma.car.update({ where: { id: ex.carId }, data: { INSURANCE_C: false, updatedAt: now } as never });
        }
      } else if (ex.type === "RS_CAR_RENTAL") {
        const others = await prisma.agreement.findMany({ where: { id: { not: agreementId }, type: "RS_CAR_RENTAL" as never, carId: ex.carId, driverId: ex.driverId, isActive: true, status: "SIGNED" as never } as never });
        if (others.length === 0) {
          await prisma.car.update({ where: { id: ex.carId }, data: { RS_RENTAL: false, driverProfileId: null, status: "AVAILABLE", updatedAt: now } as never });
          await endInsuranceFor(ex.driverId, ex.carId, now);
          await prisma.driverprofile.update({ where: { id: ex.driverId }, data: { agreementSigned: false } as never }).catch(() => {});
          if (ex.driverprofile?.userId) await prisma.user.update({ where: { id: ex.driverprofile.userId }, data: { RS_RENTAL: false, updatedAt: now } as never }).catch(() => {});
        }
      }
    }

    // Notify + push driver
    if (ex.driverId) {
      try {
        await prisma.notification.create({
          data: {
            type: "AGREEMENT_SIGNED" as never, title: "Agreement Terminated",
            message: `Your agreement "${ex.title}" has been terminated.`,
            referenceType: "agreement", referenceId: agreementId,
            isForAdmin: false, driverId: ex.driverId, updatedAt: now,
          } as never,
        });
        if (ex.driverprofile?.userId) {
          const tokens = await getTokensForUsers([ex.driverprofile.userId]);
          await sendExpoPush(tokens, "Agreement Terminated 🚫",
            `Your agreement "${ex.title}" has been terminated.`,
            { route: "/agreements" });
        }
      } catch { /* best-effort */ }
    }

    return NextResponse.json(serializeAgreement(updated as never));
  } catch (err) { return fail("agreements/[id]/terminate", err); }
}
