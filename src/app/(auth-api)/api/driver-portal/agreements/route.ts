// app/api/driver/agreements/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';



export async function GET(request: NextRequest) {
  try {


    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the driver's ID from their user ID
    const driverProfile = await prisma.driverprofile.findUnique({
      where: { userId: parseInt(session.user.id) },
      select: { id: true }
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // Fetch agreements for this specific driver
    const agreements = await prisma.agreement.findMany({
      where: {
        driverId: driverProfile.id
      },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        car: {
          select: {
            registration: true,
            make: true,
            model: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      agreements: agreements.map(agreement => ({
        id: agreement.id,
        title: agreement.title,
        type: agreement.type,
        status: agreement.status,
        isActive: agreement.isActive,
        driverName: agreement.driverprofile?.user_driverprofile_userIdTouser?.name || 'N/A',
        carRegistration: agreement.car?.registration || 'N/A',
        createdAt: agreement.createdAt,
        signedAt: agreement.signedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching driver agreements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agreements' },
      { status: 500 }
    );
  }
}