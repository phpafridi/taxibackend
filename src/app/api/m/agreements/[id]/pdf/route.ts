// GET /api/m/agreements/[id]/pdf — mobile-token-authenticated PDF download
// Mirrors the web's /api/agreements/[id]/generate-pdf and generate-insurance-pdf
// but authenticates with the mobile bearer token instead of a browser session.
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../../lib/mobile-api";
import { createReadOnlyPDF, AgreementData } from "../../../../../../../lib/pdf-fill-service";
import { createReadOnlyRSRentalPDF, RSRentalAgreementData } from "../../../../../../../lib/rs-rental-pdf-service";
import fs from "fs";
import path from "path";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req);
    if (!g.ok) return g.res;

    const { id } = await params;
    const agreementId = parseInt(id, 10);
    if (isNaN(agreementId)) return NextResponse.json({ error: "Invalid agreement ID" }, { status: 400 });

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        driverprofile: {
          include: { user_driverprofile_userIdTouser: { select: { id: true, name: true, email: true, phone: true } } },
        },
        car: { select: { id: true, make: true, model: true, registration: true, year: true, color: true, bodyType: true } },
        user_agreement_createdByTouser: { select: { name: true, email: true } },
      },
    });
    if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

    // Drivers can only download their own agreement
    if (g.user.role !== "ADMIN") {
      const dpid = await driverProfileIdFor(g.user.id);
      if ((agreement as { driverId: number | null }).driverId !== dpid) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const ag = agreement as any;
    const formattedLicenseExpiry = ag.driverprofile?.licenseExpiry
      ? ag.driverprofile.licenseExpiry.toLocaleDateString("en-GB") : "";
    const formattedDateOfBirth = ag.driverprofile?.dateOfBirth
      ? ag.driverprofile.dateOfBirth.toLocaleDateString("en-GB") : "";

    const agreementData: RSRentalAgreementData = {
      id: ag.id, title: ag.title, type: ag.type, status: ag.status,
      driver: ag.driverprofile ? {
        name: ag.driverprofile.user_driverprofile_userIdTouser.name || "",
        email: ag.driverprofile.user_driverprofile_userIdTouser.email || "",
        phone: ag.driverprofile.user_driverprofile_userIdTouser.phone || "",
        address: ag.driverprofile.address || "",
        postcode: ag.driverprofile.postcode || "",
        licenseNumber: ag.driverprofile.licenseNumber || "",
        licenseExpiry: formattedLicenseExpiry,
        dateOfBirth: formattedDateOfBirth,
        emergencyContact: ag.driverprofile.emergencyContact || "",
        emergencyPhone: ag.driverprofile.emergencyPhone || "",
        nationalInsuranceNumber: ag.driverprofile.nationalInsuranceNumber || "",
      } : null,
      car: ag.car ? {
        make: ag.car.make || "", model: ag.car.model || "", bodyType: ag.car.bodyType || "",
        registration: ag.car.registration || "", year: ag.car.year ? ag.car.year.toString() : "",
        color: ag.car.color || "",
      } : null,
      weeklyRate: ag.weeklyRate ? Number(ag.weeklyRate) : undefined,
      depositAmount: ag.depositAmount ? Number(ag.depositAmount) : undefined,
      depositPaid: ag.depositPaid,
      startDate: ag.startDate?.toISOString() || null,
      endDate: ag.endDate?.toISOString() || null,
      dateIn: ag.dateIn?.toString() || null,
      signedAt: ag.signedAt?.toISOString() || null,
      signedByName: ag.signedByName || "",
      signatureData: ag.signatureData,
      content: ag.content,
      damageOutMajorDamage: ag.damageOutMajorDamage, damageOutDent: ag.damageOutDent,
      damageOutScratch: ag.damageOutScratch, damageOutMissing: ag.damageOutMissing,
      damageOutChip: ag.damageOutChip, damageOutNotes: ag.damageOutNotes,
      damageInMajorDamage: ag.damageInMajorDamage, damageInDent: ag.damageInDent,
      damageInScratch: ag.damageInScratch, damageInMissing: ag.damageInMissing,
      damageInChip: ag.damageInChip, damageInNotes: ag.damageInNotes,
      createdBy: ag.user_agreement_createdByTouser ? {
        name: ag.user_agreement_createdByTouser.name || "", email: ag.user_agreement_createdByTouser.email || "",
      } : null,
    };

    const agreementsDir = path.join(process.cwd(), "public", "agreements", "read-only");
    if (!fs.existsSync(agreementsDir)) fs.mkdirSync(agreementsDir, { recursive: true });

    const outputFileName = `READ_ONLY_Agreement_${agreementId}.pdf`;
    const outputPath = path.join(agreementsDir, outputFileName);
    if (ag.type === "RS_CAR_RENTAL") {
      await createReadOnlyRSRentalPDF(agreementData, outputPath);
    } else {
      await createReadOnlyPDF(agreementData, outputPath);
    }

    const pdfBuffer = fs.readFileSync(outputPath);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputFileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) { return fail("agreements/[id]/pdf", err); }
}
