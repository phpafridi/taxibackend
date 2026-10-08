import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { agreement_type, agreement_status } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();

    // Validation
    if (!data.type) {
      return NextResponse.json(
        { error: 'Agreement type is required' },
        { status: 400 }
      );
    }

    // Parse numeric values
    const weeklyRate = data.weeklyRate ? parseFloat(data.weeklyRate) : undefined;
    const depositAmount = data.depositAmount ? parseFloat(data.depositAmount) : undefined;

    // FIX: Check if driverId is provided, if it's empty string or null, set to null
    const driverId = data.driverId && data.driverId !== '' && data.driverId !== 'null' 
      ? parseInt(data.driverId) 
      : null;

    // FIX: Check if vehicleId (carId) is provided
    const carId = data.vehicleId && data.vehicleId !== '' && data.vehicleId !== 'null'
      ? parseInt(data.vehicleId)
      : null;

    // CREATE DRAFT AGREEMENT
    const agreement = await prisma.agreement.create({
      data: {
        type: data.type as agreement_type,
        driverId: driverId, // USE THE FIXED VALUE
        carId: carId, // USE THE FIXED VALUE
        insuranceId: null,
        title: data.title || `Draft ${data.type.replace('_', ' ')} - ${new Date().toLocaleDateString()}`,
        content: data.content || '',
        terms: data.terms || null,
        weeklyRate: weeklyRate,
        depositAmount: depositAmount,
        depositPaid: false,
        startDate: null,
        endDate: null,
        signedByName: null,
        signatureData: null,
        signedByUserId: null,
        status: agreement_status.DRAFT,
        isActive: true,
        createdBy: user.id,
        signedAt: null,
        updatedAt: new Date(),
      },
      include: {
        user_agreement_createdByTouser: {
          select: { name: true, email: true }
        },
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: { name: true, email: true, phone: true }
            }
          }
        },
        car: true
      }
    });

    // IMPORTANT: UPDATE CAR'S driverProfileId if both driverId and carId are provided
    if (driverId && carId) {
      try {
        // First, verify the driver exists
        const driver = await prisma.driverprofile.findUnique({
          where: { id: driverId },
        });

        if (driver) {
          // Update the car to link it with this driver
          await prisma.car.update({
            where: { id: carId },
            data: {
              driverProfileId: driverId,
              updatedAt: new Date(),
            },
          });
        }
      } catch (updateError) {
        console.error('Error updating car driverProfileId:', updateError);
        // Don't fail the whole request if car update fails
        // Continue with agreement creation
      }
    }

    // Create audit log
    await prisma.auditlog.create({
      data: {
        userId: user.id,
        action: 'CREATE_DRAFT_AGREEMENT',
        entity: 'agreement',
        entityId: agreement.id,
        newValues: JSON.stringify({
          type: agreement.type,
          title: agreement.title,
          status: agreement.status,
          driverId: agreement.driverId,
          carId: agreement.carId,
          carDriverProfileUpdated: driverId && carId // Track if car was updated
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      agreement,
      message: 'Draft agreement created successfully',
      carUpdated: !!(driverId && carId), // Indicate if car was updated
    });
  } catch (error: any) {
    console.error('Error creating draft agreement:', error);
    return NextResponse.json(
      {
        error: 'Failed to create draft agreement',
        details: error.message,
      },
      { status: 500 }
    );
  }
}