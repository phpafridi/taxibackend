// app/api/agreements/[id]/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../lib/auth-config';
import { createReadOnlyPDF, AgreementData } from '../../../../../../../lib/pdf-fill-service';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check if user is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Get agreement ID
    const params = await context.params;
    const agreementId = parseInt(params.id);

    if (isNaN(agreementId)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    // 4. Fetch agreement with ALL related data including driver profile fields
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            registration: true,
            year: true,
            color: true,
            bodyType:true,
          },
        },
        // Include the user who created the agreement
        user_agreement_createdByTouser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Format license expiry date
    const formattedLicenseExpiry = agreement.driverprofile?.licenseExpiry
      ? agreement.driverprofile.licenseExpiry.toLocaleDateString('en-GB') // "DD/MM/YYYY"
      : '';

    // Format date of birth
    const formattedDateOfBirth = agreement.driverprofile?.dateOfBirth
      ? agreement.driverprofile.dateOfBirth.toLocaleDateString('en-GB')
      : '';

    // 5. Prepare data for PDF - INCLUDING ALL REQUIRED FIELDS
    const agreementData: AgreementData = {
      id: agreement.id,
      title: agreement.title,
      type: agreement.type,
      status: agreement.status,

      driver: agreement.driverprofile ? {
        name: agreement.driverprofile.user_driverprofile_userIdTouser.name || '',
        email: agreement.driverprofile.user_driverprofile_userIdTouser.email || '',
        phone: agreement.driverprofile.user_driverprofile_userIdTouser.phone || '',
        address: agreement.driverprofile.address || '',
        postcode: agreement.driverprofile.postcode || '',
        licenseNumber: agreement.driverprofile.licenseNumber || '',
        licenseExpiry: formattedLicenseExpiry,
        dateOfBirth: formattedDateOfBirth,
        emergencyContact: agreement.driverprofile.emergencyContact || '',
        emergencyPhone: agreement.driverprofile.emergencyPhone || '',
      } : null,

      car: agreement.car ? {
        make: agreement.car.make || '',
        model: agreement.car.model || '',
        bodyType : agreement.car.bodyType || '',
        registration: agreement.car.registration || '',
        year: agreement.car.year ? agreement.car.year.toString() : '',
        color: agreement.car.color || '',
      } : null,

      weeklyRate: agreement.weeklyRate ? Number(agreement.weeklyRate) : undefined,
      depositAmount: agreement.depositAmount ? Number(agreement.depositAmount) : undefined,
      depositPaid: agreement.depositPaid,

      startDate: agreement.startDate?.toISOString() || null,
      endDate: agreement.endDate?.toISOString() || null,
      dateIn : agreement.dateIn?.toString() || null,
      signedAt: agreement.signedAt?.toISOString() || null,
      signedByName: agreement.signedByName || '',

      signatureData: agreement.signatureData,
      content: agreement.content,

      damageOutMajorDamage: agreement.damageOutMajorDamage,
      damageOutDent: agreement.damageOutDent,
      damageOutScratch: agreement.damageOutScratch,
      damageOutMissing: agreement.damageOutMissing,
      damageOutChip: agreement.damageOutChip,
      damageOutNotes: agreement.damageOutNotes,

      damageInMajorDamage: agreement.damageInMajorDamage,
      damageInDent: agreement.damageInDent,
      damageInScratch: agreement.damageInScratch,
      damageInMissing: agreement.damageInMissing,
      damageInChip: agreement.damageInChip,
      damageInNotes: agreement.damageInNotes,

      createdBy: agreement.user_agreement_createdByTouser ? {
        name: agreement.user_agreement_createdByTouser.name || '',
        email: agreement.user_agreement_createdByTouser.email || '',
      } : null,
    };

    // 6. Create output directory
    const agreementsDir = path.join(process.cwd(), "public", "agreements", "read-only");
    if (!fs.existsSync(agreementsDir)) {
      fs.mkdirSync(agreementsDir, { recursive: true });
    }

    // 7. Generate READ-ONLY PDF
    const outputFileName = `READ_ONLY_Agreement_${agreementId}.pdf`;
    const outputPath = path.join(agreementsDir, outputFileName);

    await createReadOnlyPDF(agreementData, outputPath);

    // 8. Return the PDF file
    const pdfBuffer = fs.readFileSync(outputPath);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'X-Document-Type': 'READ-ONLY-NON-EDITABLE',
        'X-Security': 'Certified-Copy-No-Editing',
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating read-only PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate read-only PDF',
        details: error.message
      },
      { status: 500 }
    );
  }
}