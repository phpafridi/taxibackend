import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverProfileIdFor, serializeAgreement, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";

const inc = { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const row = await prisma.agreement.findUnique({ where: { id: Number(id) }, include: inc });
    if (!row) return NextResponse.json({ message: "Agreement not found" }, { status: 404 });
    if (g.user.role !== "ADMIN") {
      const dpid = await driverProfileIdFor(g.user.id);
      if ((row as { driverId: number | null }).driverId !== dpid)
        return NextResponse.json({ message: "Agreement not found" }, { status: 404 });
    }
    return NextResponse.json(serializeAgreement(row as never));
  } catch (err) { return fail("agreements/[id]", err); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const row = await prisma.agreement.findUnique({ where: { id: Number(id) }, include: inc });
    if (!row) return NextResponse.json({ message: "Agreement not found" }, { status: 404 });

    const current = row as unknown as { status: string };
    // Agreements that are no longer "live" only change via their dedicated
    // endpoints (sign/terminate) — full-content edits are blocked once
    // terminated or cancelled, matching the web dashboard's edit page.
    if (
      (current.status === "TERMINATED" || current.status === "CANCELLED") &&
      // ...unless this call is only a status transition (e.g. DRAFT -> PENDING_SIGNATURE),
      // which is how "send to driver" already works below.
      Object.keys(body).some((k) => k !== "status")
    ) {
      return NextResponse.json({ message: `Agreement cannot be edited. Current status: "${current.status}".` }, { status: 400 });
    }

    // Build the update payload from whatever fields were actually sent —
    // lets the mobile app's "Edit draft" screen update any combination of
    // core details, dates, damage check-in/out, or just the status, in one
    // request. Mirrors src/app/(auth-api)/api/agreements/[id]/route.ts (PUT).
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) data.title = String(body.title);
    if (body.type !== undefined) data.type = String(body.type) as never;
    if (body.content !== undefined) data.content = String(body.content);
    if (body.terms !== undefined) data.terms = body.terms != null ? String(body.terms) : null;
    if (body.weeklyRate !== undefined) data.weeklyRate = body.weeklyRate === "" || body.weeklyRate == null ? null : Number(body.weeklyRate);
    if (body.depositAmount !== undefined) data.depositAmount = body.depositAmount === "" || body.depositAmount == null ? null : Number(body.depositAmount);
    if (body.depositPaid !== undefined) data.depositPaid = !!body.depositPaid;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(String(body.startDate)) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(String(body.endDate)) : null;
    if (body.dateIn !== undefined) data.dateIn = body.dateIn ? new Date(String(body.dateIn)) : null;
    if (body.insuranceNumber !== undefined) data.insuranceNumber = body.insuranceNumber != null ? String(body.insuranceNumber) : null;
    if (body.driverId !== undefined) data.driverId = body.driverId != null ? Number(body.driverId) : null;
    if (body.carId !== undefined) data.carId = body.carId != null ? Number(body.carId) : null;
    if (body.status !== undefined) data.status = String(body.status) as never;
    // Check-out damage
    if (body.damageOutMajorDamage !== undefined) data.damageOutMajorDamage = !!body.damageOutMajorDamage;
    if (body.damageOutDent !== undefined) data.damageOutDent = !!body.damageOutDent;
    if (body.damageOutScratch !== undefined) data.damageOutScratch = !!body.damageOutScratch;
    if (body.damageOutMissing !== undefined) data.damageOutMissing = !!body.damageOutMissing;
    if (body.damageOutChip !== undefined) data.damageOutChip = !!body.damageOutChip;
    if (body.damageOutNotes !== undefined) data.damageOutNotes = body.damageOutNotes != null ? String(body.damageOutNotes) : null;
    // Check-in damage
    if (body.damageInMajorDamage !== undefined) data.damageInMajorDamage = !!body.damageInMajorDamage;
    if (body.damageInDent !== undefined) data.damageInDent = !!body.damageInDent;
    if (body.damageInScratch !== undefined) data.damageInScratch = !!body.damageInScratch;
    if (body.damageInMissing !== undefined) data.damageInMissing = !!body.damageInMissing;
    if (body.damageInChip !== undefined) data.damageInChip = !!body.damageInChip;
    if (body.damageInNotes !== undefined) data.damageInNotes = body.damageInNotes != null ? String(body.damageInNotes) : null;

    // RS Car Rental's National Insurance Number lives on the driver
    // profile, not the agreement — update it alongside if provided and a
    // driver is attached (create-time nationalInsuranceNumber persists the
    // same way; edit should be able to correct it too).
    const nextDriverId = (body.driverId !== undefined ? data.driverId : current && (row as any).driverId) as number | null;
    if (body.nationalInsuranceNumber !== undefined && nextDriverId) {
      await prisma.driverprofile.update({ where: { id: nextDriverId }, data: { nationalInsuranceNumber: String(body.nationalInsuranceNumber) } }).catch(() => {});
    }

    const updated = await prisma.agreement.update({
      where: { id: Number(id) },
      data: data as never,
      include: inc,
    });

    // If sending to driver (DRAFT → PENDING_SIGNATURE), create notification + push
    if (body.status === "PENDING_SIGNATURE" && (row as any).driverId) {
      const driverUserId = (row as any).driverprofile?.userId;
      const agreementTitle = (row as any).title || "Agreement";

      // Create in-app notification
      await prisma.notification.create({
        data: {
          type: "AGREEMENT_SIGNED" as never,
          title: "Agreement Ready to Sign",
          message: `Your agreement "${agreementTitle}" is ready for your signature.`,
          referenceType: "agreement",
          referenceId: Number(id),
          isForAdmin: false,
          driverId: (row as any).driverId,
          updatedAt: new Date(),
        } as never,
      });

      // Send Expo push notification to driver's devices
      if (driverUserId) {
        const tokens = await getTokensForUsers([driverUserId]);
        await sendExpoPush(
          tokens,
          "Agreement Ready to Sign 📝",
          `"${agreementTitle}" is waiting for your signature.`,
          { route: `/modals/agreement-detail?id=${id}` }
        );
      }
    }

    return NextResponse.json(serializeAgreement(updated as never));
  } catch (err) { return fail("agreements/[id] PATCH", err); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const row = await prisma.agreement.findUnique({ where: { id: Number(id) } });
    if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!["DRAFT", "CANCELLED"].includes((row as { status: string }).status))
      return NextResponse.json({ message: "Only DRAFT or CANCELLED agreements can be deleted" }, { status: 400 });
    await prisma.agreement.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) { return fail("agreements/[id] DELETE", err); }
}
