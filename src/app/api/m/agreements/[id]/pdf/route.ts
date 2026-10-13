// GET /api/m/agreements/[id]/pdf — mobile-token-authenticated PDF download
// Mirrors the web's /api/agreements/[id]/generate-pdf and generate-insurance-pdf
// but authenticates with the mobile bearer token instead of a browser session.
import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../../lib/mobile-api";
import { createReadOnlyPDF, AgreementData } from "../../../../../../../lib/pdf-fill-service";
import { createReadOnlyRSRentalPDF, RSRentalAgreementData } from "../../../../../../../lib/rs-rental-pdf-service";
import { createInsuranceReadOnlyPDF, SimpleInsuranceData } from "../../../../../../../lib/insurance-pdf-service";
import { stampKindFor, stampDateFor, stampPdfFile } from "../../../../../../../lib/pdf-stamp";
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

    let outputPath: string;
    let outputFileName: string;

    if (ag.type === "INSURANCE_CERTIFICATE") {
      // Insurance certificates have their own template (same data the web's generate-insurance-pdf uses).
      if (!ag.driverprofile || !ag.car) return NextResponse.json({ error: "This certificate has no driver or vehicle" }, { status: 400 });
      const simple: SimpleInsuranceData = {
        id: ag.id,
        registration: ag.car.registration || "", vehicleMake: ag.car.make || "", vehicleModel: ag.car.model || "",
        driverName: ag.driverprofile.user_driverprofile_userIdTouser.name || "",
        driverLicenseNumber: ag.driverprofile.licenseNumber || "",
        driverAddress: ag.driverprofile.address || "",
        hireStartDate: ag.startDate?.toISOString() || new Date().toISOString(),
        hireEndDate: ag.endDate?.toISOString() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        signatureData: ag.signatureData, signedByName: ag.signedByName,
        insuranceNumber: ag.insuranceNumber !== null ? ag.insuranceNumber : "",
        issueDate: ag.createdAt?.toISOString() || new Date().toISOString(),
      };
      const dir = path.join(process.cwd(), "public", "insurance-certificates");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      outputFileName = `Insurance_Certificate_${agreementId}.pdf`;
      outputPath = path.join(dir, outputFileName);
      await createInsuranceReadOnlyPDF(simple, outputPath);
    } else {
      const agreementsDir = path.join(process.cwd(), "public", "agreements", "read-only");
      if (!fs.existsSync(agreementsDir)) fs.mkdirSync(agreementsDir, { recursive: true });
      outputFileName = `READ_ONLY_Agreement_${agreementId}.pdf`;
      outputPath = path.join(agreementsDir, outputFileName);
      if (ag.type === "RS_CAR_RENTAL") {
        await createReadOnlyRSRentalPDF(agreementData, outputPath);
      } else {
        await createReadOnlyPDF(agreementData, outputPath);
      }
    }

    // A terminated / expired document gets a big red stamp on every page.
    const kind = stampKindFor(ag);
    if (kind) await stampPdfFile(outputPath, kind, stampDateFor(kind, ag));

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
