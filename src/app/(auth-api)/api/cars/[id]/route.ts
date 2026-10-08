// app/api/cars/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      )
    }

    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid car ID",
        },
        { status: 400 }
      );
    }

    // Get car basic info
    const car = await prisma.car.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        registration: true,
        model: true,
        make: true,
        year: true,
        color: true,
        avatar: true,
        purchasePrice: true,
        purchaseDate: true,
        currentValue: true,
        isActive: true,
        status: true,
        driverProfileId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!car) {
      return NextResponse.json(
        {
          success: false,
          message: "Car not found",
        },
        { status: 404 }
      );
    }

    // Get related data in parallel
    const [
      driverProfileData,
      agreements,
      documents,
      insurances,
      ledgerRecords, // Changed from weeklyPayments to ledgerRecords
      maintenanceRequests,
      counts,
    ] = await Promise.all([
      // Get driver profile if exists
      car.driverProfileId
        ? prisma.driverprofile.findUnique({
          where: { id: car.driverProfileId },
          select: {
            id: true,
            userId: true,
            user_driverprofile_userIdTouser: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })
        : Promise.resolve(null),

      // Get agreements
      prisma.agreement.findMany({
        where: {
          carId: id,
          isActive: true
        },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          signedAt: true,
          driverId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Get documents
      prisma.document.findMany({
        where: { carId: id },
        select: {
          id: true,
          type: true,
          name: true,
          fileName: true,
          fileUrl: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Get insurances
      prisma.insurance.findMany({
        where: {
          carId: id,
          isActive: true
        },
        select: {
          id: true,
          provider: true,
          policyNo: true,
          certificateNo: true, // ADDED
          startDate: true,
          endDate: true,
          renewalDate: true, // ADDED
          yearlyCost: true,
          monthlyCharge: true,
          excessAmount: true, // ADDED
          coverageType: true, // ADDED
          notes: true, // ADDED
          isActive: true, // ADDED
          isExpired: true, // ADDED
          driverId: true,
        },
        orderBy: {
          startDate: "desc",
        },
      }),

      // Get ledger records (payments)
      prisma.ledger.findMany({
        where: {
          carId: id,
          category: {
            in: ["WEEKLY_INCOME", "INSURANCE_DRIVER_PAYMENT", "DEPOSIT", "REFUND", "FINE", "OTHER"]
          }
        },
        select: {
          id: true,
          amount: true,
          direction: true,
          category: true,
          description: true,
          paymentDate: true,
          status: true,
          driverId: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Get maintenance requests
      prisma.maintenancerequest.findMany({
        where: { carId: id },
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          mileage: true,
          status: true,
          createdAt: true,
          driverId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Get counts - updated to include ledger count
      prisma.car.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              agreement: true,
              insurance: true,
              ledger: {
                where: {
                  category: {
                    in: ["WEEKLY_INCOME", "INSURANCE_DRIVER_PAYMENT", "DEPOSIT", "REFUND", "FINE", "OTHER"]
                  }
                }
              },
              maintenancerequest: true,
              document: true,
            },
          },
        },
      }),
    ]);

    // Get driver info for related records
    const driverIds = new Set<number>();

    // Collect all driver IDs from related records
    agreements.forEach(agreement => {
      if (agreement.driverId) driverIds.add(agreement.driverId);
    });
    insurances.forEach(insurance => {
      if (insurance.driverId) driverIds.add(insurance.driverId);
    });
    ledgerRecords.forEach(record => { // Updated from weeklyPayments to ledgerRecords
      if (record.driverId) driverIds.add(record.driverId);
    });
    maintenanceRequests.forEach(request => {
      if (request.driverId) driverIds.add(request.driverId);
    });

    // Get driver profiles for all related records
    const drivers = await prisma.driverprofile.findMany({
      where: {
        id: { in: Array.from(driverIds) }
      },
      select: {
        id: true,
        userId: true,
        user_driverprofile_userIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create map for quick driver lookup
    const driverMap = new Map();
    drivers.forEach(driver => {
      driverMap.set(driver.id, {
        id: driver.id,
        userId: driver.userId,
        user: driver.user_driverprofile_userIdTouser,
      });
    });

    // Calculate total income from ledger (CREDIT direction with status ACCEPT)
    const totalIncome = ledgerRecords
      .filter(record => record.direction === "CREDIT" && record.status === "ACCEPT")
      .reduce((sum, record) => sum + record.amount.toNumber(), 0);

    // Calculate total maintenance costs (maintenance requests with status APPROVED)
    const totalMaintenance = maintenanceRequests
      .filter(request => request.status === "APPROVED")
      .reduce((sum, request) => sum + request.amount.toNumber(), 0);

    // Count active agreements
    const activeAgreements = agreements.filter(
      agreement => agreement.status === "SIGNED"
    ).length;

    const formattedCar = {
      id: car.id,
      registration: car.registration,
      model: car.model,
      make: car.make,
      year: car.year,
      color: car.color,
      avatar: car.avatar,
      purchasePrice: car.purchasePrice,
      purchaseDate: car.purchaseDate,
      currentValue: car.currentValue,
      isActive: car.isActive,
      status: car.status,
      driverProfileId: car.driverProfileId,
      createdAt: car.createdAt,
      updatedAt: car.updatedAt,
      driverprofile: driverProfileData
        ? {
          id: driverProfileData.id,
          userId: driverProfileData.userId,
          user: driverProfileData.user_driverprofile_userIdTouser,
        }
        : null,
      agreement: agreements.map(agreement => ({
        id: agreement.id,
        type: agreement.type,
        title: agreement.title,
        status: agreement.status,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        signedAt: agreement.signedAt,
        driver: agreement.driverId ? driverMap.get(agreement.driverId)?.user || null : null,
      })),
      document: documents,
      insurance: insurances.map(insurance => ({
        id: insurance.id,
        provider: insurance.provider,
        policyNo: insurance.policyNo,
        certificateNo: insurance.certificateNo, // ADD THIS
        startDate: insurance.startDate,
        endDate: insurance.endDate,
        renewalDate: insurance.renewalDate, // ADD THIS
        yearlyCost: insurance.yearlyCost,
        monthlyCharge: insurance.monthlyCharge,
        excessAmount: insurance.excessAmount, // ADD THIS
        coverageType: insurance.coverageType, // ADD THIS
        notes: insurance.notes, // ADD THIS
        isActive: insurance.isActive, // ADD THIS
        isExpired: insurance.isExpired, // ADD THIS
        driver: insurance.driverId ? driverMap.get(insurance.driverId)?.user || null : null,
      })),
      // Updated from weeklypayment to ledger
      ledger: ledgerRecords.map(record => ({
        id: record.id,
        amount: record.amount.toNumber(),
        direction: record.direction,
        category: record.category,
        description: record.description,
        paymentDate: record.paymentDate,
        status: record.status,
        paymentMethod: record.paymentMethod,
        createdAt: record.createdAt,
        driver: record.driverId ? driverMap.get(record.driverId)?.user || null : null,
      })),
      maintenancerequest: maintenanceRequests.map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        amount: request.amount.toNumber(),
        mileage: request.mileage,
        status: request.status,
        createdAt: request.createdAt,
        driver: request.driverId ? driverMap.get(request.driverId)?.user || null : null,
      })),
      statistics: {
        totalAgreements: counts?._count.agreement || 0,
        activeAgreements,
        totalInsurance: counts?._count.insurance || 0,
        totalPayments: totalIncome, // Changed to totalIncome (CREDIT + ACCEPT)
        totalMaintenance, // Sum of APPROVED maintenance requests
        totalDocuments: counts?._count.document || 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: formattedCar,
    });
  } catch (error: any) {
    console.error("Error fetching car:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch car details",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      )
    }

    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid car ID",
        },
        { status: 400 }
      );
    }

    // Check if car exists
    const existingCar = await prisma.car.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingCar) {
      return NextResponse.json(
        {
          success: false,
          message: "Car not found",
        },
        { status: 404 }
      );
    }

    // Check if new registration already exists (excluding current car)
    if (body.registration && body.registration !== existingCar.registration) {
      const duplicateCar = await prisma.car.findFirst({
        where: {
          registration: body.registration,
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicateCar) {
        return NextResponse.json(
          {
            success: false,
            message: "A car with this registration already exists",
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      model: body.model || existingCar.model,
      make: body.make || existingCar.make,
      year: body.year !== undefined ? body.year : existingCar.year,
      color: body.color !== undefined ? body.color : existingCar.color,
      avatar: body.avatar !== undefined ? body.avatar : existingCar.avatar,
      purchasePrice: body.purchasePrice || existingCar.purchasePrice,
      currentValue: body.currentValue !== undefined ? body.currentValue : existingCar.currentValue,
      status: body.status || existingCar.status,
      isActive: body.isActive !== undefined ? body.isActive : existingCar.isActive,
      driverProfileId: body.driverProfileId !== undefined ? body.driverProfileId : existingCar.driverProfileId,
      updatedAt: new Date(),
    };

    if (body.registration) {
      updateData.registration = body.registration;
    }

    if (body.purchaseDate !== undefined) {
      updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    }

    // Update car
    const updatedCar = await prisma.car.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditlog.create({
      data: {
        action: "UPDATE",
        entity: "CAR",
        entityId: id,
        oldValues: JSON.stringify(existingCar),
        newValues: JSON.stringify(updatedCar),
        changes: JSON.stringify(updateData),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Car updated successfully",
      data: updatedCar,
    });
  } catch (error: any) {
    console.error("Error updating car:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update car",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { message: "unauthorized" },
        { status: 401 }
      )
    }

    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid car ID",
        },
        { status: 400 }
      );
    }

    // Check if car exists
    const car = await prisma.car.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        registration: true,
        model: true,
        make: true,
      },
    });

    if (!car) {
      return NextResponse.json(
        {
          success: false,
          message: "Car not found",
        },
        { status: 404 }
      );
    }

    // Check if car has active agreements
    const activeAgreements = await prisma.agreement.count({
      where: {
        carId: id,
        status: "SIGNED",
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    if (activeAgreements > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete car with active agreements. Please terminate agreements first.",
        },
        { status: 400 }
      );
    }

    // Soft delete the car
    const deletedCar = await prisma.car.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: "DELETED",
        driverProfileId: null,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditlog.create({
      data: {
        action: "DELETE",
        entity: "CAR",
        entityId: id,
        oldValues: JSON.stringify(car),
        newValues: JSON.stringify(deletedCar),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Car deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete car",
        error: error.message,
      },
      { status: 500 }
    );
  }
}