import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth-config";

// GET - Get driver details by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { messsage: "unauthorized" },
        { status: 401 }
      )
    }
    const { id } = await params;
    const driverId = parseInt(id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid driver ID",
          error: `ID '${id}' is not a valid number`
        },
        { status: 400 }
      );
    }


    // Get driver with all related data
    const driver = await prisma.user.findUnique({
      where: {
        id: driverId,
        role: "DRIVER",
        deletedAt: null,
      },
      include: {
        driverprofile_driverprofile_userIdTouser: { // CORRECT RELATION NAME
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
        {
          success: false,
          message: "Driver not found",
          error: `Driver with ID ${driverId} not found or is deleted`
        },
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
        ...driver,
        driverprofile: driverProfile, // Map to expected frontend field name
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
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete driver
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = parseInt(id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid driver ID"
        },
        { status: 400 }
      );
    }

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Update driver profile first
      const driverProfile = await tx.driverprofile.update({
        where: { userId: driverId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Then update user
      const driver = await tx.user.update({
        where: { id: driverId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return { driver, driverProfile };
    });

    return NextResponse.json({
      success: true,
      message: "Driver deleted successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error deleting driver:", error);

    let errorMessage = "Failed to delete driver";
    let statusCode = 500;

    if (error.code === 'P2025') {
      errorMessage = "Driver not found";
      statusCode = 404;
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: error.message
      },
      { status: statusCode }
    );
  }
}