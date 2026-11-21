// GET /api/m/profile — current user's full profile
// PUT /api/m/profile — update name / phone / avatar (base64 dataUri or URL)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma, requireUser, toMobileUser, driverProfileIdFor, serializeDriverProfile, driverUserInclude, fail, sendExpoPush, getTokensForUsers } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const user = await prisma.user.findUnique({ where: { id: g.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    const payload: Record<string, unknown> = { ...toMobileUser(user as never) };
    if (user.role === "DRIVER") {
      const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id }, include: driverUserInclude });
      if (dp) payload.driverProfile = serializeDriverProfile(dp as never);
    }
    return NextResponse.json(payload);
  } catch (err) { return fail("profile", err); }
}

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) data.name = String(body.name).trim();
    if (body.phone != null) data.phone = String(body.phone).trim() || null;
    if (body.avatar != null) data.avatar = String(body.avatar) || null;
    const user = await prisma.user.update({ where: { id: g.user.id }, data });
    return NextResponse.json(toMobileUser(user as never));
  } catch (err) { return fail("profile", err); }
}

// DELETE /api/m/profile  { password }
// Deletes the signed-in person's account: the login is closed for good (email freed, password scrambled,
// sessions + push tokens + location + uploaded photos/documents removed).
// A driver who has SIGNED an agreement: that agreement is a legal contract the company must keep, and its PDF
// is built from the driver's profile, so the details printed on it (name, phone, address, licence, date of
// birth, NI, emergency contact) are kept with it. A driver who never signed anything is fully anonymised.
export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const password = body.password != null ? String(body.password) : "";
    const user = await prisma.user.findUnique({ where: { id: g.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (!password || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json({ message: "Password is incorrect" }, { status: 401 });

    // App Store 5.1.1(v): every account can be deleted in the app.
    // Only guard: the company must keep at least one manager, or nobody could run the fleet.
    if (user.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({
        where: { role: "ADMIN" as never, isActive: true, deletedAt: null, id: { not: user.id } } as never,
      });
      if (otherAdmins === 0)
        return NextResponse.json({ message: "You are the only manager. Add another manager account first, then you can delete yours." }, { status: 409 });
    }
    let hadActiveHire = false;
    let keepContractDetails = false;

    const now = new Date();
    const dp = await prisma.driverprofile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (dp) {
      const [liveAgreements, cars] = await Promise.all([
        prisma.agreement.count({ where: { driverId: dp.id, status: { in: ["PENDING_SIGNATURE", "SIGNED"] as never[] } } as never }),
        prisma.car.count({ where: { driverProfileId: dp.id, deletedAt: null } as never }),
      ]);
      // An active hire no longer blocks deletion (Apple: no customer-service step).
      // Signed agreements and payments stay on record (they keep the signer's name), and
      // managers are told so they can arrange the car's return.
      hadActiveHire = liveAgreements > 0 || cars > 0;
      keepContractDetails = (await prisma.agreement.count({ where: { driverId: dp.id, signedAt: { not: null } } as never })) > 0;

      // Unsigned paperwork goes; signed agreements stay as the legal record.
      await prisma.agreement.updateMany({ where: { driverId: dp.id, status: { in: ["DRAFT", "PENDING_SIGNATURE"] } } as never, data: { status: "CANCELLED", isActive: false, updatedAt: now } as never }).catch(() => {});
      await prisma.document.deleteMany({ where: { driverId: dp.id, maintenanceId: null, agreementId: null, carId: null, insuranceId: null } as never }).catch(() => {});
      await prisma.driverlocation.deleteMany({ where: { driverId: dp.id } as never }).catch(() => {});
      await prisma.fcmToken.deleteMany({ where: { OR: [{ userId: user.id }, { driverId: dp.id }] } as never }).catch(() => {});
      await prisma.driverprofile.update({
        where: { id: dp.id },
        data: keepContractDetails ? { isActive: false, deletedAt: now, updatedAt: now } as never : {
          licenseNumber: null, licenseExpiry: null, driverNumber_licenseNumber: null, driverNumber_licenseExpiry: null,
          address: null, postcode: null, emergencyContact: null, emergencyPhone: null, dateOfBirth: null, nationalInsuranceNumber: null,
          isActive: false, deletedAt: now, updatedAt: now,
        } as never,
      });
    } else {
      await prisma.fcmToken.deleteMany({ where: { userId: user.id } as never }).catch(() => {});
    }

    await prisma.session.deleteMany({ where: { userId: user.id } as never }).catch(() => {});
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Keep the name + phone printed on a signed agreement; otherwise erase them.
        // (A manager's name is also kept: it is printed on the agreements they issued.)
        name: keepContractDetails || user.role === "ADMIN" ? user.name : "Deleted user",
        phone: keepContractDetails ? user.phone : null,
        email: `deleted-${user.id}-${now.getTime()}@deleted.invalid`, avatar: null,
        password: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
        isActive: false, deletedAt: now, updatedAt: now,
      } as never,
    });
    // Tell the managers (best effort — never blocks the deletion).
    try {
      const who = user.name || "A user";
      const title = user.role === "ADMIN" ? "Manager account deleted" : "Driver deleted their account";
      const message = user.role === "ADMIN"
        ? `${who} deleted their manager account.`
        : hadActiveHire
          ? `${who} deleted their account while they still had an active hire or car. Please arrange the car's return and end the agreement.`
          : `${who} deleted their account.`;
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true, deletedAt: null, id: { not: user.id } } as never, select: { id: true } });
      await Promise.all(admins.map((a: { id: number }) => prisma.notification.create({
        data: { type: "SYSTEM" as never, priority: hadActiveHire ? "HIGH" : "MEDIUM", title, message, isForAdmin: true, userId: a.id, updatedAt: now } as never,
      }).catch(() => {})));
      const tokens = await getTokensForUsers(admins.map((a: { id: number }) => a.id));
      await sendExpoPush(tokens, title, message, {});
    } catch { /* best effort */ }

    return NextResponse.json({ success: true });
  } catch (err) { return fail("profile/delete", err); }
}
