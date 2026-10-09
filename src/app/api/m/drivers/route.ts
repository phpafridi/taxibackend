import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, pageParams, paginated, qstr, serializeDriverProfile, driverUserInclude, fail } from "../../../../../lib/mobile-api";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { sp, page, limit, skip } = pageParams(req.url);
    const search = qstr(sp, "search");
    const isActive = qstr(sp, "isActive");
    const isVerified = qstr(sp, "isVerified");
    const eligibleForAgreement = qstr(sp, "eligibleForAgreement");
    // Applicants (PENDING / REJECTED) live in the Applications screen, not the drivers list.
    const where: Record<string, unknown> = { deletedAt: null, AND: [{ OR: [{ applicationStatus: null }, { applicationStatus: "APPROVED" }] }] };
    if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";
    if (isVerified === "true" || isVerified === "false") where.isVerified = isVerified === "true";
    if (search) where.OR = [
      { licenseNumber: { contains: search } },
      { user_driverprofile_userIdTouser: { is: { name: { contains: search } } } },
      { user_driverprofile_userIdTouser: { is: { email: { contains: search } } } },
    ];
    // Used by the "New Agreement" picker — a driver who already has a live
    // agreement (draft, awaiting signature, or signed) must not be offered
    // again for a conflicting type until it expires, is terminated, or is
    // cancelled. HIRE_AGREEMENT and RS_CAR_RENTAL occupy the driver the same
    // way (both are "the driver is renting a car from us"), so an active one
    // of EITHER blocks a new one of EITHER — a driver can't be mid-hire on
    // two cars at once, whichever of those two types it's badged as. An
    // INSURANCE_CERTIFICATE is independent of both — a driver with an active
    // hire/rental is still eligible for an insurance certificate, and vice versa.
    if (eligibleForAgreement === "true") {
      const agreementType = qstr(sp, "agreementType");
      const conflictingTypes =
        agreementType === "HIRE_AGREEMENT" || agreementType === "RS_CAR_RENTAL"
          ? ["HIRE_AGREEMENT", "RS_CAR_RENTAL"]
          : agreementType
          ? [agreementType]
          : null;
      where.agreement = {
        none: {
          status: { in: ["DRAFT", "PENDING_SIGNATURE", "SIGNED"] },
          ...(conflictingTypes ? { type: { in: conflictingTypes as never[] } } : {}),
        },
      };
    }
    const [total, drivers] = await Promise.all([
      prisma.driverprofile.count({ where }),
      prisma.driverprofile.findMany({ where, include: driverUserInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return NextResponse.json(paginated(drivers.map(serializeDriverProfile as never), total, page, limit));
  } catch (err) { return fail("drivers", err); }
}

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const body = await req.json().catch(() => ({}));
    if (!body.name || !body.email) return NextResponse.json({ message: "name and email are required" }, { status: 400 });
    const email = String(body.email).trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
    const password = await bcrypt.hash(String(body.password || Math.random().toString(36).slice(2)), 10);
    const user = await prisma.user.create({
      data: {
        name: String(body.name), email, password, role: "DRIVER",
        phone: body.phone != null ? String(body.phone) : null,
        isActive: true, HIRE: Boolean(body.HIRE), INSURANCE_C: Boolean(body.INSURANCE_C), updatedAt: new Date(),
      },
    });
    const dp = await prisma.driverprofile.create({
      data: {
        userId: user.id,
        licenseNumber: body.licenseNumber != null ? String(body.licenseNumber) : null,
        licenseExpiry: body.licenseExpiry ? new Date(String(body.licenseExpiry)) : null,
        dateOfBirth: body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null,
        address: body.address != null ? String(body.address) : null,
        postcode: body.postcode != null ? String(body.postcode) : null,
        emergencyContact: body.emergencyContact != null ? String(body.emergencyContact) : null,
        emergencyPhone: body.emergencyPhone != null ? String(body.emergencyPhone) : null,
        weeklyAmount: body.weeklyAmount != null ? Number(body.weeklyAmount) : 0,
        depositPaid: body.depositPaid != null ? Number(body.depositPaid) : null,
        isActive: true, isVerified: false, updatedAt: new Date(),
      },
      include: driverUserInclude,
    });
    return NextResponse.json(serializeDriverProfile(dp as never), { status: 201 });
  } catch (err) { return fail("drivers", err); }
}
