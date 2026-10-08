import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../../../lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../../lib/auth-config';


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check session - only admins can approve maintenance requests
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can approve maintenance requests
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can approve maintenance requests' },
        { status: 403 }
      );
    }

    // Extract params using await
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const requestId = parseInt(id);

    // Get the current request
    const maintenanceRequest = await prisma.maintenancerequest.findUnique({
      where: { id: requestId },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    if (maintenanceRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Request is not in pending status' },
        { status: 400 }
      );
    }

    // Update the maintenance request
    const updatedRequest = await prisma.maintenancerequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    const notificationData = {
      type: 'MAINTENANCE_APPROVED' as const,
      priority: 'HIGH' as const,
      title: 'MAINTENANCE REQUEST APPROVED',
      message: `YOUR MAINTENANCE REQUEST HAS BEEN APPROVED`,
      referenceType: 'MAINTENANCE_REQUEST',
      actionUrl : '/driver-portal/car',
      referenceId: requestId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isForAdmin: false,
      driverId: maintenanceRequest.driverId!, // Using ! to assert non-null
    };

    // Send notification
    await prisma.notification.create({
      data: notificationData,
    });

    // Send FCM notification to driver
    try {
      const cookie = request.headers.get('cookie') || '';
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notification/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie' : cookie,
        },
        body: JSON.stringify({
          driverId: maintenanceRequest.driverId,
          notification: {
            title: 'MAINTENANCE REQUEST APPROVED',
            body: `YOUR MAINTENANCE REQUEST HAS BEEN APPROVED`,
          },
          data: {
            type: 'MAINTENANCE_APPROVED',
            requestId: requestId.toString(),
            url: '/driver-portal/car',
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Maintenance request approved successfully'
    });

  } catch (error: any) {
    console.error('Error approving maintenance request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve request' },
      { status: 500 }
    );
  }
}