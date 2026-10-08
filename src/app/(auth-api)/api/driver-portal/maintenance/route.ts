import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'DRIVER') return NextResponse.json({ error: 'Only drivers can submit maintenance requests' }, { status: 403 });

    const body = await request.json();
    const { carId, title, description, amount, estimatedAmount, garageName, garageContact, notes, document, mileage } = body;

    // Validate required fields
    if (!carId || !title || !description || amount < 0 || mileage === undefined || mileage === null || mileage === '') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate mileage is a positive number
    const mileageNum = Number(mileage);
    if (isNaN(mileageNum) || mileageNum < 0) {
      return NextResponse.json({ error: 'Mileage must be a valid positive number' }, { status: 400 });
    }

    const driverProfile = await prisma.driverprofile.findUnique({ where: { userId: parseInt(session.user.id) } });
    if (!driverProfile) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });

    const driverId = driverProfile.id;

    const car = await prisma.car.findFirst({ where: { id: parseInt(carId), driverProfileId: driverId } });
    if (!car) return NextResponse.json({ error: 'Car not found or not assigned to you' }, { status: 404 });

    // Create maintenance request + document + notifications
    const result = await prisma.$transaction(async (tx) => {
      const maintenanceRequest = await tx.maintenancerequest.create({
        data: {
          carId: parseInt(carId),
          driverId,
          title,
          description,
          mileage: mileageNum,
          amount: parseFloat(amount),
          estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : parseFloat(amount),
          garageName: garageName || null,
          garageContact: garageContact || null,
          notes: notes || null,
          status: 'PENDING',
          updatedAt: new Date(),
        },
      });

      if (document) {
        await tx.document.create({
          data: {
            type: 'MAINTENANCE_INVOICE',
            name: `Maintenance Quotation - ${title}`,
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            maintenanceId: maintenanceRequest.id,
            driverId,
            carId: parseInt(carId),
            description: `Quotation for maintenance request: ${title}`,
            updatedAt: new Date(),
          },
        });
      }

      await tx.auditlog.create({
        data: {
          driverId,
          action: 'CREATE',
          entity: 'MAINTENANCE_REQUEST',
          entityId: maintenanceRequest.id,
          newValues: JSON.stringify(maintenanceRequest),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      const adminUsers = await tx.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
      await Promise.all(adminUsers.map(admin =>
        tx.notification.create({
          data: {
            type: 'MAINTENANCE_REQUEST',
            priority: 'HIGH',
            title: 'New Maintenance Request',
            message: `New maintenance request submitted for ${car.registration}: ${title}`,
            referenceType: 'MAINTENANCE_REQUEST',
            actionUrl: '/maint',
            isForAdmin: true,
            referenceId: maintenanceRequest.id,
            userId: admin.id,
            driverId,
            updatedAt: new Date(),
          },
        })
      ));

      return { maintenanceRequest, car };
    });

    // Send push notification to admins via your **working endpoint**
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const cookie = request.headers.get('cookie') || '';

      await fetch(`${baseUrl}/api/notification/send-to-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({
          notification: { title: 'New Maintenance Request', body: `New maintenance request submitted for ${result.car.registration}: ${title}` },
          data: { type: 'MAINTENANCE_REQUEST', maintenanceId: result.maintenanceRequest.id.toString(), url: '/maint' },
        }),
      });
    } catch (err) {
      console.error('Failed to send admin notifications:', err);
    }

    return NextResponse.json({ success: true, message: 'Maintenance request created successfully', data: result.maintenanceRequest });

  } catch (error: any) {
    console.error('Error creating maintenance request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create maintenance request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a driver
    if (session.user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Only drivers can view maintenance requests' },
        { status: 403 }
      );
    }

    // Get driver profile
    const driverProfile = await prisma.driverprofile.findUnique({
      where: {
        userId: parseInt(session.user.id)
      }
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const driverId = driverProfile.id;

    // For getting maintenance requests for a specific car
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get('carId');

    if (!carId) {
      return NextResponse.json(
        { error: 'Car ID is required' },
        { status: 400 }
      );
    }

    // Verify the car belongs to this driver
    const car = await prisma.car.findFirst({
      where: {
        id: parseInt(carId),
        driverProfileId: driverId,
      },
    });

    if (!car) {
      return NextResponse.json(
        { error: 'Car not found or not assigned to you' },
        { status: 404 }
      );
    }

    const maintenanceRequests = await prisma.maintenancerequest.findMany({
      where: {
        carId: parseInt(carId),
        driverId,
      },
      include: {
        document: true,
        car: {
          select: {
            registration: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: maintenanceRequests,
    });

  } catch (error: any) {
    console.error('Error fetching maintenance requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}