import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

// GET - Get driver details by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const driverId = parseInt(id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        { message: "Invalid driver ID" },
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
              orderBy: { createdAt: "desc" },
            },
            // Include driver's documents
            document: {
              orderBy: { createdAt: "desc" },
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
              orderBy: { endDate: "desc" },
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
              orderBy: { weekStart: "desc" },
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
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { message: "Driver not found" },
        { status: 404 }
      );
    }

    // Extract driver profile from the relation
    const driverProfile = driver.driverprofile_driverprofile_userIdTouser;

    // Calculate statistics - convert Decimal to number
    const totalWeeklyPayments =
      driverProfile?.weeklypayment?.reduce(
        (sum: number, payment: any) => sum + Number(payment.amount || 0),
        0
      ) || 0;

    const activeAgreements =
      driverProfile?.agreement?.filter(
        (agreement: any) => agreement.status === "SIGNED"
      ).length || 0;

    const pendingPayments =
      driverProfile?.weeklypayment?.filter(
        (payment: any) => payment.status === "PENDING"
      ).length || 0;

    // Format the response to match frontend expectations
    const responseData = {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar, // Make sure this is included
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
      driverprofile: driverProfile
        ? {
            id: driverProfile.id,
            licenseNumber: driverProfile.licenseNumber,
            licenseExpiry: driverProfile.licenseExpiry?.toISOString() || null,
            driverNumber_licenseNumber: driverProfile.driverNumber_licenseNumber, // Added
            driverNumber_licenseExpiry: driverProfile.driverNumber_licenseExpiry?.toISOString() || null, // Added
            address: driverProfile.address,
            postcode: driverProfile.postcode,
            emergencyContact: driverProfile.emergencyContact,
            emergencyPhone: driverProfile.emergencyPhone,
            dateOfBirth: driverProfile.dateOfBirth?.toISOString() || null,
            weeklyAmount: Number(driverProfile.weeklyAmount),
            depositPaid: Number(driverProfile.depositPaid),
            isActive: driverProfile.isActive,
            isVerified: driverProfile.isVerified,
            verifiedAt: driverProfile.verifiedAt?.toISOString() || null,
            agreementSigned: driverProfile.agreementSigned,
            agreementSignedAt:
              driverProfile.agreementSignedAt?.toISOString() || null,
            createdAt: driverProfile.createdAt.toISOString(),
            updatedAt: driverProfile.updatedAt.toISOString(),
            car: driverProfile.car?.map((car) => ({
              id: car.id,
              registration: car.registration,
              model: car.model,
              make: car.make,
              year: car.year,
              color: car.color,
              status: car.status,
              avatar: car.avatar,
            })) || [],
            agreement: driverProfile.agreement?.map((agreement) => ({
              id: agreement.id,
              title: agreement.title,
              type: agreement.type,
              status: agreement.status,
              signedAt: agreement.signedAt?.toISOString() || null,
              startDate: agreement.startDate?.toISOString() || null,
              endDate: agreement.endDate?.toISOString() || null,
              car: agreement.car
                ? {
                    registration: agreement.car.registration,
                    model: agreement.car.model,
                    make: agreement.car.make,
                  }
                : null,
            })) || [],
            document: driverProfile.document?.map((doc) => ({
              id: doc.id,
              type: doc.type,
              name: doc.name,
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              createdAt: doc.createdAt.toISOString(),
            })) || [],
            insurance: driverProfile.insurance?.map((insurance) => ({
              id: insurance.id,
              provider: insurance.provider,
              policyNo: insurance.policyNo,
              startDate: insurance.startDate.toISOString(),
              endDate: insurance.endDate.toISOString(),
              car: insurance.car
                ? {
                    registration: insurance.car.registration,
                    model: insurance.car.model,
                  }
                : null,
            })) || [],
            weeklypayment: driverProfile.weeklypayment?.map((payment) => ({
              id: payment.id,
              amount: Number(payment.amount),
              weekStart: payment.weekStart.toISOString(),
              weekEnd: payment.weekEnd.toISOString(),
              status: payment.status,
              car: payment.car
                ? {
                    registration: payment.car.registration,
                    model: payment.car.model,
                  }
                : null,
            })) || [],
            maintenancerequest:
              driverProfile.maintenancerequest?.map((request) => ({
                id: request.id,
                title: request.title,
                description: request.description,
                amount: Number(request.amount),
                status: request.status,
                createdAt: request.createdAt.toISOString(),
                car: request.car
                  ? {
                      registration: request.car.registration,
                      model: request.car.model,
                    }
                  : null,
              })) || [],
          }
        : null,
      statistics: {
        totalWeeklyPayments,
        activeAgreements,
        pendingPayments,
        totalCars: driverProfile?.car?.length || 0,
        totalDocuments: driverProfile?.document?.length || 0,
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { message: "Failed to fetch driver details", error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update driver details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const driverId = parseInt(id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        { message: "Invalid driver ID" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();


    const {
      name,
      email,
      phone,
      avatar,
      licenseNumber,
      licenseExpiry,
      driverNumber_licenseNumber, // Added
      driverNumber_licenseExpiry, // Added
      address,
      postcode,
      emergencyContact,
      emergencyPhone,
      weeklyAmount,
      depositPaid,
      isActive,
      isVerified,
      dateOfBirth,
      driverProfileId
    } = body;

    // Use transaction for atomic operations
    const updatedDriver = await prisma.$transaction(async (tx) => {
      // Update user table
      const userUpdateData: any = {
        name,
        email,
        phone,
        isActive,
        updatedAt: new Date(),
      };

      // Only update avatar if provided (could be null to remove it)
      if (avatar !== undefined) {
        userUpdateData.avatar = avatar;
      }

      const user = await tx.user.update({
        where: { id: driverId },
        data: userUpdateData,
      });

      // Update driver profile if driverProfileId is provided
      let driverProfile = null;
      if (driverProfileId) {
        const driverProfileUpdateData: any = {
          licenseNumber,
          driverNumber_licenseNumber, // Added
          address,
          postcode,
          emergencyContact,
          emergencyPhone,
          weeklyAmount: weeklyAmount ? parseFloat(weeklyAmount) : undefined,
          depositPaid: depositPaid ? parseFloat(depositPaid) : undefined,
          isVerified,
          updatedAt: new Date(),
        };

        // Handle license expiry date
        if (licenseExpiry) {
          driverProfileUpdateData.licenseExpiry = new Date(licenseExpiry);
        } else if (licenseExpiry === null) {
          driverProfileUpdateData.licenseExpiry = null;
        }

        // Handle driver number license expiry date
        if (driverNumber_licenseExpiry) {
          driverProfileUpdateData.driverNumber_licenseExpiry = new Date(driverNumber_licenseExpiry);
        } else if (driverNumber_licenseExpiry === null) {
          driverProfileUpdateData.driverNumber_licenseExpiry = null;
        }

        // Handle date of birth
        if (dateOfBirth) {
          driverProfileUpdateData.dateOfBirth = new Date(dateOfBirth);
        } else if (dateOfBirth === null) {
          driverProfileUpdateData.dateOfBirth = null;
        }

        driverProfile = await tx.driverprofile.update({
          where: { id: driverProfileId },
          data: driverProfileUpdateData,
        });
      }

      return { user, driverProfile };
    });

    return NextResponse.json({
      success: true,
      message: "Driver updated successfully",
      data: updatedDriver
    });

  } catch (error: any) {
    console.error("Error updating driver:", error);

    // Handle Prisma errors
    let errorMessage = "Failed to update driver";
    let statusCode = 500;

    if (error.code === "P2002") {
      errorMessage = "Email already exists";
      statusCode = 409;
    } else if (error.code === "P2025") {
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
// DELETE - Soft delete driver
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const driverId = parseInt(id);

    if (isNaN(driverId)) {
      return NextResponse.json(
        { message: "Invalid driver ID" },
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
      message: "Driver deleted successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("Error deleting driver:", error);

    let errorMessage = "Failed to delete driver";
    let statusCode = 500;

    if (error.code === "P2025") {
      errorMessage = "Driver not found";
      statusCode = 404;
    }

    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: statusCode }
    );
  }
}