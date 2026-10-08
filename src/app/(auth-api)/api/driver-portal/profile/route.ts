import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

// GET - Get current logged-in driver's own data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Get current logged-in user by ID from session
    const userId = parseInt(session.user.id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { message: "Invalid user ID in session" },
        { status: 400 }
      );
    }

    const driver = await prisma.user.findUnique({
      where: {
        id: userId,
        role: "DRIVER",
        deletedAt: null,
      },
      include: {
        driverprofile_driverprofile_userIdTouser: {
          include: {
            // Include driver's cars
            car: {
              select: {
                id: true,
                registration: true,
                model: true,
                make: true,
                year: true,
                color: true,
                status: true,
                avatar: true,
                bodyType: true,
              },
              where: { deletedAt: null },
            },
            // Include driver's agreements
            agreement: {
              where: { isActive: true },
              include: {
                car: {
                  select: {
                    registration: true,
                    model: true,
                    make: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            // Include driver's documents
            document: {
              orderBy: { createdAt: 'desc' },
            },
            // Include driver's insurance
            insurance: {
              include: {
                car: {
                  select: {
                    registration: true,
                    model: true,
                  },
                },
              },
              orderBy: { endDate: 'desc' },
            },
            // Include driver's weekly payments
            weeklypayment: {
              include: {
                car: {
                  select: {
                    registration: true,
                    model: true,
                  },
                },
              },
              orderBy: { weekStart: 'desc' },
              take: 10,
            },
            // Include driver's maintenance requests
            maintenancerequest: {
              include: {
                car: {
                  select: {
                    registration: true,
                    model: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { message: "Driver not found or you don't have access" },
        { status: 404 }
      );
    }

    // Extract driver profile from the relation
    const driverProfile = driver.driverprofile_driverprofile_userIdTouser;

    // Calculate statistics - convert Decimal to number
    const totalWeeklyPayments = driverProfile?.weeklypayment?.reduce(
      (sum: number, payment: any) => sum + Number(payment.amount || 0),
      0
    ) || 0;

    const activeAgreements = driverProfile?.agreement?.filter(
      (agreement: any) => agreement.status === 'SIGNED'
    ).length || 0;

    const pendingPayments = driverProfile?.weeklypayment?.filter(
      (payment: any) => payment.status === 'PENDING'
    ).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        avatar: driver.avatar,
        isActive: driver.isActive,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt,
        driverprofile: driverProfile, // Rename to match frontend expectation
        statistics: {
          totalWeeklyPayments,
          activeAgreements,
          pendingPayments,
          totalCars: driverProfile?.car?.length || 0,
          totalDocuments: driverProfile?.document?.length || 0,
        },
      },
    });

  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to fetch driver details", 
        error: error.message 
      },
      { status: 500 }
    );
  }
}