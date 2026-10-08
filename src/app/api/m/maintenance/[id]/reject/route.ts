import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, serializeMaintenance, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../../../lib/mobile-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const row = await prisma.maintenancerequest.update({
      where: { id: Number(id) },
      data: { status: "REJECTED", rejectionReason: body.rejectionReason != null ? String(body.rejectionReason) : null, updatedAt: new Date() },
      include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude }, document: true },
    });
    const r = row as any;

    // Notify driver
    try {
      if (r.driverId) {
        await prisma.notification.create({
          data: {
            type: "MAINTENANCE_REJECTED" as never,
            title: "Maintenance Rejected ❌",
            message: `Your maintenance request "${r.title}" was rejected${body.rejectionReason ? `: ${body.rejectionReason}` : "."}`,
            referenceType: "maintenance", referenceId: Number(id),
            isForAdmin: false, driverId: r.driverId, updatedAt: new Date(),
          } as never,
        });
        const driverUserId = r.driverprofile?.userId;
        if (driverUserId) {
          const tokens = await getTokensForUsers([driverUserId]);
          await sendExpoPush(tokens, "Maintenance Rejected ❌",
            `"${r.title}" was rejected${body.rejectionReason ? `: ${body.rejectionReason}` : ""}.`,
            { route: `/modals/maintenance-detail?id=${id}` });
        }
      }
    } catch { /* best-effort */ }

    return NextResponse.json(serializeMaintenance(row as never));
  } catch (err) { return fail("maintenance/[id]/reject", err); }
}
