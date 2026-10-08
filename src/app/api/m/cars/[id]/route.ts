import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, serializeCar, driverUserInclude, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const car = await prisma.car.findFirst({ where: { id: Number(id), deletedAt: null }, include: { driverprofile: { include: driverUserInclude } } });
    if (!car) return NextResponse.json({ message: "Car not found" }, { status: 404 });
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); if ((car as { driverProfileId: number | null }).driverProfileId !== dpid) return NextResponse.json({ message: "Car not found" }, { status: 404 }); }
    return NextResponse.json(serializeCar(car as never));
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
    const car = await prisma.car.update({ where: { id: Number(id) }, data, include: { driverprofile: { include: driverUserInclude } } });
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
