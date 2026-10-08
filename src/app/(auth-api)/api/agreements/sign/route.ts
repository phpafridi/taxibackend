import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agreementId, signatureData, signedByName } = await request.json();

    if (!agreementId || !signatureData || !signedByName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ✅ Get user with correct relation name
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        driverprofile_driverprofile_userIdTouser: true,
      },
    });

    const driverProfile = user?.driverprofile_driverprofile_userIdTouser;

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // ✅ Find agreement correctly
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        driverId: driverProfile.id,
        status: 'PENDING_SIGNATURE',
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found or already signed' },
        { status: 404 }
      );
    }

    // ✅ Update agreement
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedByName,
        signatureData,
        
      },
    });

    // ✅ Update driver profile
    if (agreement.type === 'HIRE_AGREEMENT') {
      await prisma.driverprofile.update({
        where: { id: driverProfile.id },
        data: {
          agreementSigned: true,
          agreementSignedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      agreement: updatedAgreement,
    });
  } catch (error) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      { error: 'Failed to sign agreement' },
      { status: 500 }
    );
  }
}
