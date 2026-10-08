// app/api/agreements/[id]/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { agreement_type, agreement_status } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agreementId = parseInt(id);

    if (isNaN(agreementId)) {
      return NextResponse.json({ error: 'Invalid agreement ID' }, { status: 400 });
    }

    const { signatureData, signedByName } = await request.json();

    if (!signatureData || !signedByName) {
      return NextResponse.json(
        { error: 'Signature and name are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get agreement
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        status: agreement_status.PENDING_SIGNATURE,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found or not available for signing' },
        { status: 404 }
      );
    }

    // Check if agreement has a driver assigned before signing
    if (!agreement.driverId) {
      return NextResponse.json(
        { error: 'Cannot sign agreement: No driver assigned' },
        { status: 400 }
      );
    }

    // Authorization check - only driver can sign their own agreement
    if (user.role === 'DRIVER') {
      const driverProfile = await prisma.driverprofile.findUnique({
        where: { userId: user.id },
      });

      if (!driverProfile || driverProfile.id !== agreement.driverId) {
        return NextResponse.json({ error: 'Not authorized to sign this agreement' }, { status: 403 });
      }
    }

    // Wrap all DB updates in a transaction — if any step fails, all roll back
    const now = new Date();
    const updatedAgreement = await prisma.$transaction(async (tx) => {
      // 1. Sign the agreement
      const signed = await tx.agreement.update({
        where: { id: agreementId },
        data: {
          status: agreement_status.SIGNED,
          signedAt: now,
          signedByName,
          signatureData,
          signedByUserId: user.id,
          updatedAt: now,
        },
      });

      // 2. Update driver profile + car status together for hire agreements
      if (agreement.type === agreement_type.HIRE_AGREEMENT) {
        await tx.driverprofile.update({
          where: { id: agreement.driverId! },
          data: {
            agreementSigned: true,
            agreementSignedAt: now,
            ...(agreement.weeklyRate && { weeklyAmount: agreement.weeklyRate }),
            ...(agreement.depositAmount && { depositPaid: agreement.depositAmount }),
          },
        });

        if (agreement.carId) {
          await tx.car.update({
            where: { id: agreement.carId },
            data: {
              driverProfileId: agreement.driverId!,
              status: 'RENTED',
            },
          });
        }
      }

      return signed;
    });

    // Create audit log
    await prisma.auditlog.create({
      data: {
        userId: user.id,
        action: 'SIGN_AGREEMENT',
        entity: 'agreement',
        entityId: agreementId,
        oldValues: JSON.stringify(agreement),
        newValues: JSON.stringify(updatedAgreement),
        changes: JSON.stringify({ signedByName, signatureData: '[SIGNATURE_DATA]' }),
        createdAt: new Date(),
        driverId: agreement.driverId!,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'AGREEMENT_SIGNED',
        priority: 'HIGH',
        title: 'Agreement Signed',
        message: `Agreement "${agreement.title}" has been signed by ${signedByName}`,
        referenceType: 'agreement',
        referenceId: agreementId,
        actionUrl : '/agreements',
        createdAt: new Date(),
        updatedAt: new Date(),
        isForAdmin: true,
        userId: agreement.createdBy || user.id,
        driverId: agreement.driverId!,
      },
    });

    // Send FCM notification to admins
    try {
      // Get all admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      // Send notification to each admin
      const cookie = request.headers.get('cookie') || '';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      for (const admin of adminUsers) {
        await fetch(`${baseUrl}/api/notification/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie' : cookie,
          },
          body: JSON.stringify({
            userId: admin.id, // PASSING USER ID HERE
            notification: {
              title: 'Agreement Signed',
              body: `Agreement "${agreement.title}" has been signed by ${signedByName}`,
            },
            data: {
              type: 'AGREEMENT_SIGNED',
              agreementId: agreementId.toString(),
              url: '/agreements',
              signedByName: signedByName,
              agreementTitle: agreement.title,
            }
          }),
        });
      }

      // Also send to the agreement creator if they're not an admin
      if (agreement.createdBy && agreement.createdBy !== user.id) {
        await fetch(`${baseUrl}/api/notification/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie' : cookie,
          },
          body: JSON.stringify({
            userId: agreement.createdBy, // PASSING CREATOR USER ID HERE
            notification: {
              title: 'Agreement Signed',
              body: `Agreement "${agreement.title}" that you created has been signed by ${signedByName}`,
            },
            data: {
              type: 'AGREEMENT_SIGNED',
              agreementId: agreementId.toString(),
              url: `/agreements/${agreementId}`,
              signedByName: signedByName,
              agreementTitle: agreement.title,
            }
          }),
        });
      }



    } catch (error) {
      console.error('Failed to send push notification:', error);
    }

    return NextResponse.json({
      success: true,
      agreement: updatedAgreement,
      message: 'Agreement signed successfully',
    });
  } catch (error: any) {
    console.error('Error signing agreement:', error);
    return NextResponse.json(
      {
        error: 'Failed to sign agreement',
        details: error.message,
      },
      { status: 500 }
    );
  }
}