// app/api/agreements/regenerate-all-pdfs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../lib/auth-config';
import { createReadOnlyPDF, AgreementData } from '../../../../../../../lib/pdf-fill-service';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {

    // 1. Check if user is logged in and is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.error('❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN') {
      console.error('❌ Non-admin access attempt by:', user.email);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }


    // 2. Fetch all signed agreements
    const agreements = await prisma.agreement.findMany({
      where: {
        status: 'SIGNED',
        signatureData: { not: null },
      },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        car: true,
      },
      orderBy: {
        signedAt: 'desc',
      },
    });

    if (agreements.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No signed agreements with signatures found to regenerate',
        results: [],
        total: 0,
        successful: 0,
        failed: 0,
      });
    }

    // 3. Create output directory
    const outputDir = path.join(process.cwd(), "public", "agreements", "regenerated");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });

    } else {
      // Clear existing files in the directory
      const files = fs.readdirSync(outputDir);
    }

    // 4. Process each agreement
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const [index, agreement] of agreements.entries()) {

      try {
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
            licenseExpiry: agreement.driverprofile.licenseExpiry
              ? agreement.driverprofile.licenseExpiry.toLocaleDateString('en-GB')
              : '',
            dateOfBirth: agreement.driverprofile.dateOfBirth
              ? agreement.driverprofile.dateOfBirth.toLocaleDateString('en-GB')
              : '',
            emergencyContact: agreement.driverprofile.emergencyContact || '',
            emergencyPhone: agreement.driverprofile.emergencyPhone || '',
          } : null,

          car: agreement.car ? {
            make: agreement.car.make || '',
            model: agreement.car.model || '',
            registration: agreement.car.registration || '',
          } : null,

          weeklyRate: agreement.weeklyRate ? Number(agreement.weeklyRate) : undefined,
          depositAmount: agreement.depositAmount ? Number(agreement.depositAmount) : undefined,
          depositPaid: agreement.depositPaid,

          startDate: agreement.startDate?.toISOString() || null,
          endDate: agreement.endDate?.toISOString() || null,
          signedAt: agreement.signedAt?.toISOString() || null,
          signedByName: agreement.signedByName,

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


        };


        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFileName = `REGEN_${agreement.id}_${timestamp}.pdf`;
        const outputPath = path.join(outputDir, outputFileName);


        // Use createReadOnlyPDF instead of fillHireAgreementPDF
        await createReadOnlyPDF(agreementData, outputPath);

        // Verify file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);

          results.push({
            id: agreement.id,
            title: agreement.title,
            success: true,
            filePath: `/agreements/regenerated/${outputFileName}`,
            downloadUrl: `/api/agreements/download-regenerated/${agreement.id}`,
            fileName: outputFileName,
            size: stats.size,
            driver: agreementData.driver?.name,
            vehicle: agreementData.car?.registration,
          });

          successCount++;
        } else {
          throw new Error('PDF file was not created');
        }

      } catch (agreementError: any) {
        console.error(`   ❌ Failed to process agreement ${agreement.id}:`, agreementError.message);

        results.push({
          id: agreement.id,
          title: agreement.title,
          success: false,
          error: agreementError.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? agreementError.stack : undefined,
        });

        failCount++;
      }
    }

    // 5. Create a summary report
    const summaryPath = path.join(outputDir, `REGENERATION_SUMMARY_${Date.now()}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      generatedBy: user.email,
      totalAgreements: agreements.length,
      successful: successCount,
      failed: failCount,
      results: results,
    }, null, 2));


    // 6. Return results
    return NextResponse.json({
      success: true,
      message: `Processed ${agreements.length} agreements`,
      summary: {
        total: agreements.length,
        successful: successCount,
        failed: failCount,
        timestamp: new Date().toISOString(),
        generatedBy: user.name || user.email,
      },
      results: results,
      downloadSummary: `/agreements/regenerated/${path.basename(summaryPath)}`,
      // Create download links for successful PDFs
      successfulFiles: results
        .filter(r => r.success)
        .map(r => ({
          id: r.id,
          title: r.title,
          downloadUrl: r.downloadUrl,
          fileName: r.fileName,
          size: r.size,
        })),
    });

  } catch (error: any) {
    console.error('❌ Error regenerating PDFs:', error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        error: 'Failed to regenerate PDFs',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to list regenerated PDFs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const outputDir = path.join(process.cwd(), "public", "agreements", "regenerated");

    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({
        success: true,
        message: 'No regenerated PDFs found',
        files: [],
      });
    }

    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);

        // Extract agreement ID from filename
        const match = file.match(/REGEN_(\d+)_/);
        const agreementId = match ? parseInt(match[1]) : null;

        return {
          fileName: file,
          filePath: `/agreements/regenerated/${file}`,
          size: stats.size,
          created: stats.mtime,
          agreementId: agreementId,
          downloadUrl: `/api/agreements/download-regenerated-file?file=${encodeURIComponent(file)}`,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Newest first

    return NextResponse.json({
      success: true,
      message: `Found ${files.length} regenerated PDFs`,
      files: files,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
    });

  } catch (error: any) {
    console.error('Error listing regenerated PDFs:', error);
    return NextResponse.json(
      { error: 'Failed to list regenerated PDFs' },
      { status: 500 }
    );
  }
}