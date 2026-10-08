// app/api/ledger/resources/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    // Get cars for dropdown
    const cars = await prisma.car.findMany({
      where: { isActive: true },
      select: {
        id: true,
        registration: true,
        make: true,
        model: true,
        driverProfileId: true,
      },
      orderBy: { registration: 'asc' }
    });

    // Get drivers for dropdown
    const drivers = await prisma.driverprofile.findMany({
      where: { isActive: true },
      include: {
        user_driverprofile_userIdTouser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    const transformedDrivers = drivers.map(driver => ({
      id: driver.id,
      name: driver.user_driverprofile_userIdTouser?.name || `Driver ${driver.id}`
    }));

    return NextResponse.json({
      success: true,
      data: {
        cars,
        drivers: transformedDrivers
      }
    });

  } catch (error: any) {
    console.error('Error fetching ledger resources:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}