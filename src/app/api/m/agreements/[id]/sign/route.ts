import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma, requireUser, driverProfileIdFor, serializeAgreement, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../../../lib/mobile-api";

// The mobile app's signature pad outputs an SVG data-uri (data:image/svg+xml,<urlencoded xml>).
// The PDF generator (pdf-fill-service) expects a base64 PNG/JPEG (data:image/png;base64,...),
// the same format the web's canvas-based signature pad produces. Convert here so both
// platforms store the same shape of signatureData and the PDF pipeline needs no changes.
async function normalizeSignatureToPngBase64(input: string): Promise<string> {
  if (!input.startsWith("data:image/svg+xml")) return input; // already a raster data-uri — leave as-is

  const encoded = input.replace(/^data:image\/svg\+xml,?/, "");
  const svgXml = decodeURIComponent(encoded);
  const pngBuffer = await sharp(Buffer.from(svgXml)).png().toBuffer();
  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    const agreementId = Number(id);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const rawSignatureData = body.signatureData != null ? String(body.signatureData) : "";
    const signedByName = body.signedByName != null ? String(body.signedByName) : "";
    if (!rawSignatureData || !signedByName)
      return NextResponse.json({ message: "Signature and name are required" }, { status: 400 });

    let signatureData = rawSignatureData;
    try {
      signatureData = await normalizeSignatureToPngBase64(rawSignatureData);
    } catch (convErr) {
      console.error("Signature SVG->PNG conversion failed, storing original:", convErr);
      // Fall back to the raw value rather than blocking the sign action;
      // the PDF route will fall back to a text signature if this can't be rendered.
    }

    const agreement = await prisma.agreement.findFirst({ where: { id: agreementId, status: "PENDING_SIGNATURE" as never } });
    if (!agreement) return NextResponse.json({ message: "Agreement not found or not available for signing" }, { status: 404 });
    const ag = agreement as unknown as { driverId: number | null; carId: number | null; type: string; weeklyRate: unknown; depositAmount: unknown; title: string; createdBy: number | null };
    if (!ag.driverId) return NextResponse.json({ message: "Cannot sign: no driver assigned" }, { status: 400 });

    if (g.user.role === "DRIVER") {
      const dpid = await driverProfileIdFor(g.user.id);
      if (dpid !== ag.driverId) return NextResponse.json({ message: "Not authorized to sign this agreement" }, { status: 403 });
    }

    const now = new Date();
    const signed = await prisma.$transaction(async (tx) => {
      const s = await tx.agreement.update({
        where: { id: agreementId },
        data: { status: "SIGNED" as never, signedAt: now, signedByName, signatureData, signedByUserId: g.user.id, updatedAt: now },
        include: { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude } },
      });
      if (ag.type === "HIRE_AGREEMENT" || ag.type === "RS_CAR_RENTAL") {
        await tx.driverprofile.update({
          where: { id: ag.driverId! },
          data: {
            agreementSigned: true, agreementSignedAt: now,
            ...(ag.weeklyRate ? { weeklyAmount: ag.weeklyRate as never } : {}),
            ...(ag.depositAmount ? { depositPaid: ag.depositAmount as never } : {}),
          } as never,
        });
        if (ag.carId) {
          const flag = ag.type === "RS_CAR_RENTAL" ? { RS_RENTAL: true } : { HIRE: true };
          await tx.car.update({ where: { id: ag.carId }, data: { driverProfileId: ag.driverId!, status: "RENTED", ...flag, updatedAt: now } as never });
        }
      }
      return s;
    });

    // Notify admins + push
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true }, select: { id: true } });
      const targets = new Set<number>(admins.map((a) => a.id));
      if (ag.createdBy) targets.add(ag.createdBy);

      await Promise.all([...targets].map((uid) => prisma.notification.create({
        data: {
          type: "AGREEMENT_SIGNED" as never, title: "Agreement Signed ✍️",
          message: `Agreement "${ag.title}" has been signed by ${signedByName}.`,
          referenceType: "agreement", referenceId: agreementId,
          isForAdmin: true, userId: uid, driverId: ag.driverId!, updatedAt: now,
        } as never,
      })));

      const tokens = await getTokensForUsers([...targets]);
      await sendExpoPush(tokens, "Agreement Signed ✍️",
        `"${ag.title}" has been signed by ${signedByName}.`,
        { route: `/modals/agreement-detail?id=${agreementId}` });
    } catch { /* best-effort */ }

    return NextResponse.json(serializeAgreement(signed as never));
  } catch (err) { return fail("agreements/[id]/sign", err); }
}
