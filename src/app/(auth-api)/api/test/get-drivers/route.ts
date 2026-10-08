import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';

export async function GET() {
  try {
    // Optional: Add authentication to restrict access
    // const session = await getServerSession(authOptions);
    
    // If you want to restrict to admins only, uncomment this:
    // if (!session?.user || session.user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized. Admin access required.' },
    //     { status: 401 }
    //   );
    // }

    const drivers = await prisma.driverprofile.findMany({
      include: {
        user_driverprofile_userIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        FcmTokens: {
          select: {
            id: true,
            token: true,
            platform: true,
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    // Transform the data to match your interface
    const formattedDrivers = drivers.map(driver => ({
      id: driver.id,
      userId: driver.userId,
      user: driver.user_driverprofile_userIdTouser, // This should match your interface
      FcmTokens: driver.FcmTokens
    }));
    
    return NextResponse.json({
      success: true,
      drivers: formattedDrivers
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}