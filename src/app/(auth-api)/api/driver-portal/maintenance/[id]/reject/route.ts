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
    // ========== ADD SECURITY CHECK ==========
    // Check session - only admins can reject maintenance requests
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can reject maintenance requests
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can reject maintenance requests' },
        { status: 403 }
      );
    }
    // ========== END SECURITY CHECK ==========

    // Extract params using await
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    // Get the body for rejection reason
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
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
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        approvedAt: new Date(),
      },
    });

    const notificationData = {
      type: 'MAINTENANCE_REJECTED' as const,
      priority: 'HIGH' as const,
      title: 'MAINTENANCE REQUEST REJECTED',
      message: `YOUR MAINTENANCE REQUEST HAS BEEN REJECTED`,
      referenceType: 'MAINTENANCE_REQUEST',
      actionUrl : '/driver-portal/car',
      referenceId: requestId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isForAdmin: false,
      driverId: maintenanceRequest.driverId!,
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
            title: 'MAINTENANCE REQUEST REJECTED',
            body: `YOUR MAINTENANCE REQUEST HAS BEEN REJECTED`,
          },
          data: {
            type: 'MAINTENANCE_REJECTED',
            requestId: requestId.toString(),
            url: '/driver-portal/car',
            rejectionReason: rejectionReason,
          }
        }),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Maintenance request rejected successfully'
    });

  } catch (error: any) {
    console.error('Error rejecting maintenance request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reject request' },
      { status: 500 }
    );
  }
}