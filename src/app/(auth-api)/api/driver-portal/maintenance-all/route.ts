// app/api/admin/maintenance/pending/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const pendingRequests = await prisma.maintenancerequest.findMany({
      where: {
        status: 'PENDING'
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
        car: {
          select: {
            registration: true,
            model: true,
            make: true,
            year: true,
          },
        },
        document: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert Decimal to number for frontend
    const formattedRequests = pendingRequests.map(request => ({
      ...request,
      amount: request.amount ? Number(request.amount) : 0,
      estimatedAmount: request.estimatedAmount ? Number(request.estimatedAmount) : null,
      approvedAmount: request.approvedAmount ? Number(request.approvedAmount) : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedRequests
    });

  } catch (error: any) {
    console.error('Error fetching pending maintenance requests:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch pending requests' 
      },
      { status: 500 }
    );
  }
}