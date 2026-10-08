import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, serializeDriverProfile, driverUserInclude, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const targetId = Number(id);

    // Admins can view any driver. A driver may only view their own record.
    if (g.user.role !== "ADMIN") {
      const ownDpid = await driverProfileIdFor(g.user.id);
      if (ownDpid !== targetId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const dp = await prisma.driverprofile.findUnique({ where: { id: targetId }, include: driverUserInclude });
    if (!dp) return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    return NextResponse.json(serializeDriverProfile(dp as never));
  } catch (err) { return fail("drivers/[id]", err); }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["licenseNumber", "address", "postcode", "emergencyContact", "emergencyPhone"]) if (body[k] !== undefined) data[k] = body[k] === null ? null : String(body[k]);
    if (body.weeklyAmount !== undefined) data.weeklyAmount = Number(body.weeklyAmount);
    if (body.depositPaid !== undefined) data.depositPaid = body.depositPaid === null ? null : Number(body.depositPaid);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.isVerified !== undefined) data.isVerified = Boolean(body.isVerified);
    if (body.licenseExpiry !== undefined) data.licenseExpiry = body.licenseExpiry ? new Date(String(body.licenseExpiry)) : null;
    if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(String(body.dateOfBirth)) : null;
    const dp = await prisma.driverprofile.update({ where: { id: Number(id) }, data, include: driverUserInclude });
    return NextResponse.json(serializeDriverProfile(dp as never));
  } catch (err) { return fail("drivers/[id]", err); }
}
