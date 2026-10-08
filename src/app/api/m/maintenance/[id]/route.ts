import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, serializeMaintenance, driverUserInclude, carBasicSelect, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const row = await prisma.maintenancerequest.findUnique({ where: { id: Number(id) }, include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude }, document: true } });
    if (!row) return NextResponse.json({ message: "Request not found" }, { status: 404 });
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); if ((row as { driverId: number }).driverId !== dpid) return NextResponse.json({ message: "Request not found" }, { status: 404 }); }
    return NextResponse.json(serializeMaintenance(row as never));
  } catch (err) { return fail("maintenance/[id]", err); }
}
