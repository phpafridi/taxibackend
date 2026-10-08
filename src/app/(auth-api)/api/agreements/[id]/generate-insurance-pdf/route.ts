import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../lib/auth-config';
import { createInsuranceReadOnlyPDF, SimpleInsuranceData } from '../../../../../../../lib/insurance-pdf-service';
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

    // 2. Get agreement ID
    const params = await context.params;
    const agreementId = parseInt(params.id);
    
    
    if (isNaN(agreementId)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    // 3. Fetch agreement with minimal required data
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
              },
            },
          },
        },
        car: {
          select: {
            make: true,
            model: true,
            registration: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (!agreement.driverprofile) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 400 });
    }

    if (!agreement.car) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 400 });
    }

    // 4. Prepare simple data for PDF
    const simpleData: SimpleInsuranceData = {
      id: agreement.id,
      
      // Vehicle details
      registration : agreement.car.registration || '',
      vehicleMake: agreement.car.make || '',
      vehicleModel: agreement.car.model || '',
      
      // Driver details
      driverName: agreement.driverprofile.user_driverprofile_userIdTouser.name || '',
      driverLicenseNumber: agreement.driverprofile.licenseNumber || '',
      driverAddress: agreement.driverprofile.address || '',
      
      // Dates
      hireStartDate: agreement.startDate?.toISOString() || new Date().toISOString(),
      hireEndDate: agreement.endDate?.toISOString() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year default
      
      // Signature
      signatureData: agreement.signatureData,
      signedByName: agreement.signedByName,
      insuranceNumber: agreement.insuranceNumber !== null ? agreement.insuranceNumber : "",
      
      // Issue date - use agreement creation date
      issueDate: agreement.createdAt?.toISOString() || new Date().toISOString(),
    };



    // 5. Create output directory
    const outputDir = path.join(process.cwd(), "public", "insurance-certificates");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 6. Generate READ-ONLY Insurance PDF
    const outputFileName = `Insurance_Certificate_${agreementId}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);
  
    
    await createInsuranceReadOnlyPDF(simpleData, outputPath);

    // 7. Return the PDF file
    const pdfBuffer = fs.readFileSync(outputPath);
    
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating simple insurance PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insurance certificate', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}