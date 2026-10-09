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
