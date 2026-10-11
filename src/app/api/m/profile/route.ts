// GET /api/m/profile — current user's full profile
// PUT /api/m/profile — update name / phone / avatar (base64 dataUri or URL)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma, requireUser, toMobileUser, driverProfileIdFor, serializeDriverProfile, driverUserInclude, fail } from "../../../../../lib/mobile-api";

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
// Deletes the signed-in person's account. Personal details, photos, push tokens and location are erased and the
// login is closed. Signed agreements and ledger entries are kept (anonymised) because UK businesses must keep
// financial and contract records. Blocked while the driver still has a live agreement or a car.
export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const password = body.password != null ? String(body.password) : "";
    const user = await prisma.user.findUnique({ where: { id: g.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    if (user.role === "ADMIN")
      return NextResponse.json({ message: "Manager accounts can't be deleted in the app. Please contact support." }, { status: 403 });
    if (!password || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json({ message: "Password is incorrect" }, { status: 401 });

    const now = new Date();
    const dp = await prisma.driverprofile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (dp) {
      const [liveAgreements, cars] = await Promise.all([
        prisma.agreement.count({ where: { driverId: dp.id, status: { in: ["PENDING_SIGNATURE", "SIGNED"] as never[] } } as never }),
        prisma.car.count({ where: { driverProfileId: dp.id, deletedAt: null } as never }),
      ]);
      if (liveAgreements > 0 || cars > 0)
        return NextResponse.json({ message: "You still have an active agreement or a car. Ask your fleet manager to end it first, then delete your account." }, { status: 409 });

      await prisma.agreement.updateMany({ where: { driverId: dp.id, status: "DRAFT" } as never, data: { status: "CANCELLED", isActive: false, updatedAt: now } as never }).catch(() => {});
      await prisma.document.deleteMany({ where: { driverId: dp.id, maintenanceId: null, agreementId: null, carId: null, insuranceId: null } as never }).catch(() => {});
      await prisma.driverlocation.deleteMany({ where: { driverId: dp.id } as never }).catch(() => {});
      await prisma.fcmToken.deleteMany({ where: { OR: [{ userId: user.id }, { driverId: dp.id }] } as never }).catch(() => {});
      await prisma.driverprofile.update({
        where: { id: dp.id },
        data: {
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
        name: "Deleted user", email: `deleted-${user.id}-${now.getTime()}@deleted.invalid`, phone: null, avatar: null,
        password: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
        isActive: false, deletedAt: now, updatedAt: now,
      } as never,
    });
    return NextResponse.json({ success: true });
  } catch (err) { return fail("profile/delete", err); }
}
