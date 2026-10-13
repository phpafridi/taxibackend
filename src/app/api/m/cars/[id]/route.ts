import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, serializeCar, driverUserInclude, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const car = await prisma.car.findFirst({ where: { id: Number(id), deletedAt: null }, include: { driverprofile: { include: driverUserInclude } }, omit: { avatar: true } });
    if (!car) return NextResponse.json({ message: "Car not found" }, { status: 404 });
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); if ((car as { driverProfileId: number | null }).driverProfileId !== dpid) return NextResponse.json({ message: "Car not found" }, { status: 404 }); }
    const out = serializeCar(car as never) as Record<string, unknown>;
    if (g.user.role !== "ADMIN") { delete out.purchasePrice; delete out.currentValue; }

    // The car's insurance IS its insurance certificate: the latest one a driver has signed (or that has since ended).
    const cert = await prisma.agreement.findFirst({
      where: { carId: Number(id), type: "INSURANCE_CERTIFICATE", status: { in: ["SIGNED", "EXPIRED", "TERMINATED"] } },
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, status: true, signedAt: true, signedByName: true, signatureData: true, startDate: true, endDate: true,
        terminatedAt: true, insuranceNumber: true,
        driverprofile: { select: { userId: true, user_driverprofile_userIdTouser: { select: { name: true, updatedAt: true } } } },
      },
    });
    if (cert) {
      const du = cert.driverprofile?.user_driverprofile_userIdTouser;
      const pastEnd = cert.endDate ? new Date(cert.endDate) < new Date(new Date().toDateString()) : false;
      out.insuranceCertificate = {
        id: cert.id,
        status: cert.status === "SIGNED" && pastEnd ? "EXPIRED" : cert.status,
        signedAt: cert.signedAt ? cert.signedAt.toISOString() : undefined,
        signedByName: cert.signedByName ?? du?.name ?? undefined,
        signatureData: cert.signatureData ?? undefined,
        startDate: cert.startDate ? cert.startDate.toISOString() : undefined,
        endDate: cert.endDate ? cert.endDate.toISOString() : undefined,
        terminatedAt: cert.terminatedAt ? cert.terminatedAt.toISOString() : undefined,
        insuranceNumber: cert.insuranceNumber ?? undefined,
        driverName: du?.name ?? undefined,
        driverAvatarUrl: cert.driverprofile?.userId
          ? `/api/m/images/user/${cert.driverprofile.userId}${du?.updatedAt ? `?v=${new Date(du.updatedAt).getTime()}` : ""}` : undefined,
      };
    }
    return NextResponse.json(out);
  } catch (err) { return fail("cars/[id]", err); }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of ["registration", "make", "model", "color", "bodyType", "avatar", "status"]) if (body[k] !== undefined) data[k] = body[k] === null ? null : String(body[k]);
    if (body.year !== undefined) data.year = body.year === null ? null : Number(body.year);
    if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice);
    if (body.currentValue !== undefined) data.currentValue = body.currentValue === null ? null : Number(body.currentValue);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.HIRE !== undefined) data.HIRE = Boolean(body.HIRE);
    if (body.INSURANCE_C !== undefined) data.INSURANCE_C = Boolean(body.INSURANCE_C);
    const car = await prisma.car.update({ where: { id: Number(id) }, data, include: { driverprofile: { include: driverUserInclude } }, omit: { avatar: true } });
    return NextResponse.json(serializeCar(car as never));
  } catch (err) { return fail("cars/[id]", err); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    // Soft delete so web FKs / history are preserved.
    await prisma.car.update({ where: { id: Number(id) }, data: { deletedAt: new Date(), isActive: false, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (err) { return fail("cars/[id]", err); }
}
