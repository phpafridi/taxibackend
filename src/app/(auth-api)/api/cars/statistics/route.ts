// app/api/cars/statistics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

export async function GET(request: NextRequest) {
  try {

        const session = await getServerSession(authOptions)
        if (!session) {
          return NextResponse.json(
            { messsage: "unauthorized" },
            { status: 401 }
          )
        }
    

    // Get all cars statistics
    const [
      totalCars,
      availableCars,
      rentedCars,
      maintenanceCars,
      totalRevenue,
    ] = await Promise.all([
      // Total cars (excluding deleted)
      prisma.car.count({
        where: { deletedAt: null },
      }),

      // Available cars
      prisma.car.count({
        where: {
          deletedAt: null,
          isActive: true,
          status: "AVAILABLE",
        },
      }),

      // Rented cars
      prisma.car.count({
        where: {
          deletedAt: null,
          isActive: true,
          status: "RENTED",
        },
      }),

      // Cars in maintenance
      prisma.car.count({
        where: {
          deletedAt: null,
          isActive: true,
          status: "MAINTENANCE",
        },
      }),

      // Total revenue from weekly payments
      prisma.weeklypayment.aggregate({
        where: {
          status: "PAID",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Get recent activity - FIXED: Don't include problematic relations
    const recentCars = await prisma.car.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        registration: true,
        model: true,
        make: true,
        status: true,
        driverProfileId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Get driver names for recent cars
    const driverProfileIds = recentCars
      .map(car => car.driverProfileId)
      .filter(id => id !== null) as number[];
    
    let driverProfiles: any[] = [];
    if (driverProfileIds.length > 0) {
      driverProfiles = await prisma.driverprofile.findMany({
        where: {
          id: { in: driverProfileIds }
        },
        select: {
          id: true,
          userId: true,
          user_driverprofile_userIdTouser: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Get agreement counts for recent cars
    const carIds = recentCars.map(car => car.id);
    const activeAgreements = await prisma.agreement.groupBy({
      by: ['carId'],
      where: {
        carId: { in: carIds },
        status: "SIGNED",
        isActive: true,
      },
      _count: {
        carId: true,
      },
    });

    // Create maps for quick lookup
    const driverProfileMap = new Map();
    driverProfiles.forEach(profile => {
      driverProfileMap.set(profile.id, profile);
    });

    const agreementMap = new Map();
    activeAgreements.forEach(item => {
      agreementMap.set(item.carId, item._count.carId > 0);
    });

    // Get status distribution
    const statusDistribution = await prisma.car.groupBy({
      by: ["status"],
      where: { deletedAt: null, isActive: true },
      _count: {
        status: true,
      },
    });

    // Get make distribution
    const makeDistribution = await prisma.car.groupBy({
      by: ["make"],
      where: { deletedAt: null },
      _count: {
        make: true,
      },
      orderBy: {
        _count: {
          make: "desc",
        },
      },
      take: 5,
    });

    const statistics = {
      totalCars,
      availableCars,
      rentedCars,
      maintenanceCars,
      inactiveCars: totalCars - (availableCars + rentedCars + maintenanceCars),
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
      statusDistribution: statusDistribution.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      makeDistribution: makeDistribution.map((item) => ({
        make: item.make,
        count: item._count.make,
      })),
      recentCars: recentCars.map((car) => {
        const driverProfile = car.driverProfileId ? driverProfileMap.get(car.driverProfileId) : null;
        
        return {
          id: car.id,
          registration: car.registration,
          model: car.model,
          make: car.make,
          status: car.status,
          driver: driverProfile?.user_driverprofile_userIdTouser?.name || null,
          hasActiveAgreement: agreementMap.get(car.id) || false,
        };
      }),
    };

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    console.error("Error fetching car statistics:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch car statistics",
        error: error.message,
      },
      { status: 500 }
    );
  }
}