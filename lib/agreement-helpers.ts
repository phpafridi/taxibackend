// lib/agreement-helpers.ts — shared by the agreement routes.
import { prisma } from "./prisma";

/** Save details typed into an agreement form back onto the driver / car records,
 *  so the next edit (or the next agreement) is pre-filled instead of blank. */
export async function writeBackAgreementDetails(
  driverId: number | null, carId: number | null, body: Record<string, unknown>,
): Promise<void> {
  const str = (v: unknown) => (v == null ? undefined : String(v).trim());
  if (driverId) {
    const data: Record<string, unknown> = {};
    const ln = str(body.licenseNumber); if (ln) data.licenseNumber = ln;
    const ad = str(body.address); if (ad) data.address = ad;
    const pc = str(body.postcode); if (pc) data.postcode = pc;
    const le = str(body.licenseExpiry);
    if (le) { const d = new Date(le); if (!isNaN(d.getTime())) data.licenseExpiry = d; }
    const ni = str(body.nationalInsuranceNumber); if (ni) data.nationalInsuranceNumber = ni;
    if (Object.keys(data).length) await prisma.driverprofile.update({ where: { id: driverId }, data: { ...data, updatedAt: new Date() } as never }).catch(() => {});
  }
  if (carId) {
    const bt = str(body.bodyType);
    if (bt) await prisma.car.update({ where: { id: carId }, data: { bodyType: bt, updatedAt: new Date() } as never }).catch(() => {});
  }
}


const HIRE_KINDS = ["HIRE_AGREEMENT", "RS_CAR_RENTAL"];
export const isHireKind = (t: unknown) => typeof t === "string" && HIRE_KINDS.includes(t);

/** A driver — and a car — can be on ONE Hire agreement or ONE RS car rental at a time (they are the same slot).
 *  Returns a message if the pair would break that rule, or null if all is fine.
 *  `signedOnly` checks against agreements already signed (used at signing time). */
export async function hireConflict(
  driverId: number | null, carId: number | null, excludeId?: number, signedOnly = false,
): Promise<string | null> {
  const status = { in: (signedOnly ? ["SIGNED"] : ["DRAFT", "PENDING_SIGNATURE", "SIGNED"]) as never[] };
  const base = { type: { in: HIRE_KINDS as never[] }, status, ...(excludeId ? { id: { not: excludeId } } : {}) };
  const label = (t: string) => (t === "RS_CAR_RENTAL" ? "RS car rental" : "hire agreement");
  if (driverId) {
    const other = await prisma.agreement.findFirst({
      where: { ...base, driverId } as never, include: { car: { select: { registration: true } } },
    }) as unknown as { type: string; car?: { registration: string } | null } | null;
    if (other) return `This driver already has a ${label(other.type)}${other.car ? ` (${other.car.registration})` : ""}. A driver can only have one hire agreement or RS car rental at a time — use "swap car" to change their car.`;
  }
  if (carId) {
    const other = await prisma.agreement.findFirst({
      where: { ...base, carId, ...(driverId ? { NOT: { driverId } } : {}) } as never, include: { car: { select: { registration: true } } },
    }) as unknown as { type: string; car?: { registration: string } | null } | null;
    if (other) return `${other.car?.registration ?? "This car"} already has a ${label(other.type)} with another driver. A car can only be on one hire agreement or RS car rental at a time.`;
  }
  return null;
}
