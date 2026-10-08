// /app/api/insurance/route.ts
import { prisma } from "../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth-config';


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.provider || !data.startDate || !data.endDate || !data.carId) {
      return NextResponse.json(
        { message: 'Missing required fields: provider, startDate, endDate, carId' },
        { status: 400 }
      );
    }

    // Check if car exists
    const car = await prisma.car.findUnique({
      where: { id: data.carId },
    });

    if (!car) {
      return NextResponse.json(
        { message: 'Car not found' },
        { status: 404 }
      );
    }

    // Check if driver exists if driverId is provided
    if (data.driverId) {
      const driver = await prisma.driverprofile.findUnique({
        where: { id: data.driverId },
      });

      if (!driver) {
        return NextResponse.json(
          { message: 'Driver not found' },
          { status: 404 }
        );
      }
    }

    // Prepare the data for Prisma
    const insuranceData: any = {
      provider: data.provider,
      policyNo: data.policyNo || null,
      certificateNo: data.certificateNo || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isExpired: new Date(data.endDate) < new Date(),
      coverageType: data.coverageType || null,
      notes: data.notes || null,
      updatedAt: new Date(),

      // Connect to car using the relation
      car: {
        connect: { id: data.carId }
      }
    };

    // Add driver connection if provided
    if (data.driverId) {
      insuranceData.driverprofile = {
        connect: { id: data.driverId }
      };
    }

    // Add numeric fields if they exist
    if (data.yearlyCost) {
      insuranceData.yearlyCost = parseFloat(data.yearlyCost);
    }
    if (data.monthlyCharge) {
      insuranceData.monthlyCharge = parseFloat(data.monthlyCharge);
    }
    if (data.excessAmount) {
      insuranceData.excessAmount = parseFloat(data.excessAmount);
    }

    // Create insurance policy
    const insurance = await prisma.insurance.create({
      data: insuranceData,
      include: {
        car: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true,
          },
        },
        driverprofile: data.driverId ? {
          select: {
            id: true,
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        } : undefined,
      },
    });

    // Update car insurance flag if needed
    if (!car.INSURANCE_C) {
      await prisma.car.update({
        where: { id: data.carId },
        data: { INSURANCE_C: true },
      });
    }

    // Create audit log
    await prisma.auditlog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'CREATE',
        entity: 'insurance',
        entityId: insurance.id,
        newValues: JSON.stringify(insurance),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      message: 'Insurance policy created successfully',
      data: insurance,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating insurance policy:', error);

    // Handle duplicate policy number error
    if (error.code === 'P2002' && error.meta?.target?.includes('policyNo')) {
      return NextResponse.json(
        { message: 'Policy number already exists' },
        { status: 409 }
      );
    }

    // Handle duplicate carId + startDate error
    if (error.code === 'P2002' && error.meta?.target?.includes('Insurance_carId_startDate_key')) {
      return NextResponse.json(
        { message: 'Insurance policy for this car with the same start date already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: 'Error creating insurance policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}