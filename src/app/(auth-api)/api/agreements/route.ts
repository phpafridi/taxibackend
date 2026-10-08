// app/api/agreements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth-config';
import { agreement_type, agreement_status, user_role } from '@prisma/client';


export async function POST(request: NextRequest) {
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

    // 3. Get data from request
    const data = await request.json();

    // 4. VALIDATE REQUIRED FIELDS
    if (!data.driverId || !data.vehicleId) {
      return NextResponse.json(
        { error: 'Driver and vehicle selection are required' },
        { status: 400 }
      );
    }

    // 5. CONVERT USER ID TO DRIVERPROFILE ID
    const userId = parseInt(data.driverId);

    // Find driver profile for this user
    const driverProfile = await prisma.driverprofile.findUnique({
      where: { userId: userId },
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // 6. CHECK IF VEHICLE EXISTS
    const vehicleId = parseInt(data.vehicleId);
    const vehicle = await prisma.car.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // 7. Parse numbers
    const weeklyRate = data.weeklyRate ? parseFloat(data.weeklyRate) : null;
    const depositAmount = data.depositAmount ? parseFloat(data.depositAmount) : null;

    // 8. Handle dates properly
    let startDateValue = null;
    if (data.startDate) {
      const parsedDate = new Date(data.startDate);
      if (!isNaN(parsedDate.getTime())) {
        startDateValue = parsedDate;
      } else {
        console.warn('Invalid startDate provided:', data.startDate);
      }
    }

    let endDateValue = null;
    if (data.endDate) {
      const parsedDate = new Date(data.endDate);
      if (!isNaN(parsedDate.getTime())) {
        endDateValue = parsedDate;
      } else {
        console.warn('Invalid endDate provided:', data.endDate);
      }
    }

    let dateIn = null;
    if (data.dateIn) {
      const parsedDate = new Date(data.dateIn);
      if (!isNaN(parsedDate.getTime())) {
        dateIn = parsedDate;
      } else {
        console.warn('Invalid endDate provided:', dateIn);
      }
    }

    // 9. CREATE THE AGREEMENT WITH DAMAGE CHECKBOXES
    const agreement = await prisma.agreement.create({
      data: {
        type: data.type as agreement_type,
        driverId: driverProfile.id, // Use driverprofile.id
        carId: vehicleId,
        insuranceId: null,
        title: data.title || `Draft Agreement - ${new Date().toLocaleDateString()}`,
        content: data.content || '',
        terms: data.terms || null,
        weeklyRate: weeklyRate,
        depositAmount: depositAmount,
        depositPaid: false,
        startDate: startDateValue,
        endDate: endDateValue,
        dateIn,
        signedByName: null,
        signatureData: null,
        signedByUserId: null,
        status: agreement_status.DRAFT,
        isActive: true,
        createdBy: user.id,
        signedAt: null,
        updatedAt: new Date(),
        insuranceNumber: data.insuranceNumber || null,
        
        // Damage checkboxes for Check-Out
        damageOutMajorDamage: data.damageOutMajorDamage || false,
        damageOutDent: data.damageOutDent || false,
        damageOutScratch: data.damageOutScratch || false,
        damageOutMissing: data.damageOutMissing || false,
        damageOutChip: data.damageOutChip || false,
        
        // Damage checkboxes for Check-In
        damageInMajorDamage: data.damageInMajorDamage || false,
        damageInDent: data.damageInDent || false,
        damageInScratch: data.damageInScratch || false,
        damageInMissing: data.damageInMissing || false,
        damageInChip: data.damageInChip || false,
        
        // Text area notes
        damageOutNotes: data.damageOut || null,
        damageInNotes: data.damageIn || null,
      },
      include: {
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

    // 10. UPDATE CAR'S driverProfileId
    // Check if this car is not already assigned to another driver
    if (vehicle.driverProfileId && vehicle.driverProfileId !== driverProfile.id) {
      // Option 1: Unassign from previous driver first
      await prisma.agreement.updateMany({
        where: {
          carId: vehicleId,
          driverId: vehicle.driverProfileId,
          status: { in: [agreement_status.SIGNED, agreement_status.DRAFT] }
        },
        data: {
          status: agreement_status.TERMINATED,
          isActive: false,
          terminatedAt: new Date(),
          updatedAt: new Date(),
        }
      });
    }

    // Update the car with the new driver
    if (data.type === "HIRE_AGREEMENT") {
      await prisma.car.update({
        where: { id: vehicleId },
        data: {
          driverProfileId: driverProfile.id,
          status: 'RESERVED',
          HIRE: true,
          updatedAt: new Date(),
        },
      });
      await prisma.user.update({
        where: { id: driverProfile.userId },
        data: {
          HIRE: true,
        },
      });
    } else {
      await prisma.car.update({
        where: { id: vehicleId },
        data: {
          driverProfileId: driverProfile.id,
          status: 'RESERVED',
          INSURANCE_C: true,
          updatedAt: new Date(),
        },
      });
      await prisma.user.update({
        where: { id: driverProfile.userId },
        data: {
          INSURANCE_C: true,
        }
      });
    }

    // 11. Create audit log with damage info
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
          carDriverProfileId: driverProfile.id,
          carStatus: 'RESERVED',
          // Include damage info in audit log
          damageOut: {
            majorDamage: data.damageOutMajorDamage,
            dent: data.damageOutDent,
            scratch: data.damageOutScratch,
            missing: data.damageOutMissing,
            chip: data.damageOutChip,
            notes: data.damageOut
          },
          damageIn: {
            majorDamage: data.damageInMajorDamage,
            dent: data.damageInDent,
            scratch: data.damageInScratch,
            missing: data.damageInMissing,
            chip: data.damageInChip,
            notes: data.damageIn
          }
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // 12. Return success
    return NextResponse.json({
      success: true,
      agreement,
      message: 'Draft agreement created successfully',
      carUpdated: true,
      previousDriverProfileId: vehicle.driverProfileId,
      newDriverProfileId: driverProfile.id,
    });

  } catch (error: any) {
    console.error('Error creating draft agreement:', error);
    console.error('Error stack:', error.stack);

    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          error: 'Database error',
          details: 'Foreign key constraint failed'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create draft agreement',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET handler - Updated to include damage fields
export async function GET(request: NextRequest) {
  try {
    
    // 1. Check if user is logged in
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as agreement_status;
    const type = searchParams.get('type') as agreement_type;
    const driverId = searchParams.get('driverId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = {};

    // Role-based filtering
    if (user.role === user_role.DRIVER) {
      const driverProfile = await prisma.driverprofile.findUnique({
        where: { userId: user.id },
      });

      if (!driverProfile) {
        return NextResponse.json({ agreements: [], total: 0, page });
      }

      where.driverId = driverProfile.id;
    } else if (driverId) {
      where.driverId = parseInt(driverId);
    }

    // Additional filters
    if (status) where.status = status;
    if (type) where.type = type;

    // Get agreements
    const [agreements, total] = await Promise.all([
      prisma.agreement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          terms: true,
          weeklyRate: true,
          depositAmount: true,
          depositPaid: true,
          startDate: true,
          endDate: true,
          signedAt: true,
          signedByName: true,
          status: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          terminatedAt: true,
          insuranceNumber: true,
          
          // Damage checkbox fields
          damageOutMajorDamage: true,
          damageOutDent: true,
          damageOutScratch: true,
          damageOutMissing: true,
          damageOutChip: true,
          damageOutNotes: true,
          
          damageInMajorDamage: true,
          damageInDent: true,
          damageInScratch: true,
          damageInMissing: true,
          damageInChip: true,
          damageInNotes: true,
          
          // Relationships
          driverprofile: {
            include: {
              user_driverprofile_userIdTouser: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
          },
          car: {
            select: {
              id: true,
              registration: true,
              model: true,
              make: true,
              driverProfileId: true,
              status: true
            },
          },
          insurance: {
            select: { id: true, policyNo: true, provider: true },
          },
          user_agreement_createdByTouser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.agreement.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      agreements: agreements.map(agreement => ({
        ...agreement,
        // Format dates for frontend
        createdAt: agreement.createdAt.toISOString(),
        updatedAt: agreement.updatedAt.toISOString(),
        startDate: agreement.startDate?.toISOString() || null,
        endDate: agreement.endDate?.toISOString() || null,
        signedAt: agreement.signedAt?.toISOString() || null,
        terminatedAt: agreement.terminatedAt?.toISOString() || null,
        // Ensure boolean fields are properly typed
        damageOutMajorDamage: agreement.damageOutMajorDamage || false,
        damageOutDent: agreement.damageOutDent || false,
        damageOutScratch: agreement.damageOutScratch || false,
        damageOutMissing: agreement.damageOutMissing || false,
        damageOutChip: agreement.damageOutChip || false,
        damageInMajorDamage: agreement.damageInMajorDamage || false,
        damageInDent: agreement.damageInDent || false,
        damageInScratch: agreement.damageInScratch || false,
        damageInMissing: agreement.damageInMissing || false,
        damageInChip: agreement.damageInChip || false,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agreements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}