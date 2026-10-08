import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth-config";


export async function GET() {

  try {

        const session = await getServerSession(authOptions)
        if (!session) {
          return NextResponse.json(
            { messsage: "unauthorized" },
            { status: 401 }
          )
        }
    
    // First get all drivers (users with role DRIVER)
    const drivers = await prisma.user.findMany({
      where: {
        role: "DRIVER",
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Then get their driver profiles separately
    const driverIds = drivers.map(driver => driver.id);
    const driverProfiles = await prisma.driverprofile.findMany({
      where: {
        userId: { in: driverIds }
      },
      select: {
        userId: true,
        licenseNumber: true,
        isActive: true,
        isVerified: true,
        weeklyAmount: true,
        address: true,
        postcode: true,
        emergencyContact: true,
        emergencyPhone: true,
      },
    });

    // Combine the data
    const driversWithProfiles = drivers.map(driver => ({
      ...driver,
      driverProfile: driverProfiles.find(profile => profile.userId === driver.id) || null
    }));

    return NextResponse.json(driversWithProfiles);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { message: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}