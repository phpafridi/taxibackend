// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth-config";



export async function GET(request: NextRequest) {
  try {

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { messsage: "unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const isActive = searchParams.get("isActive");
    const make = searchParams.get("make");
    const model = searchParams.get("model");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { registration: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { make: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (make) {
      where.make = { contains: make, mode: "insensitive" };
    }

    if (model) {
      where.model = { contains: model, mode: "insensitive" };
    }

    // Get total count
    const total = await prisma.car.count({ where });

    // Get cars - Use select for everything
    const cars = await prisma.car.findMany({
      where,
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
        bodyType: true,
        driverProfileId: true,
        createdAt: true,
        updatedAt: true,
        agreement: {
          where: {
            isActive: true,
            status: "SIGNED",
          },
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        _count: {
          select: {
            agreement: true,
            insurance: true,
            weeklypayment: true,
            maintenancerequest: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Get driver profiles for cars that have driverProfileId
    const driverProfileIds = cars
      .map(car => car.driverProfileId)
      .filter(id => id !== null) as number[];

    let driverProfiles: any[] = [];

    if (driverProfileIds.length > 0) {
      // FIX: Use the correct relation name from schema
      driverProfiles = await prisma.driverprofile.findMany({
        where: {
          id: {
            in: driverProfileIds
          }
        },
        select: {
          id: true,
          userId: true,
          // Use the correct relation name: user_driverprofile_userIdTouser
          user_driverprofile_userIdTouser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              isActive: true,
            },
          },
        },
      });
    }

    // Create a map for quick lookup
    const driverProfileMap = new Map();
    driverProfiles.forEach(profile => {
      driverProfileMap.set(profile.id, profile);
    });

    // Format the response
    const formattedCars = cars.map((car) => {
      const driverProfile = car.driverProfileId ? driverProfileMap.get(car.driverProfileId) : null;

      return {
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
        driverprofile: driverProfile
          ? {
            id: driverProfile.id,
            userId: driverProfile.userId,
            user: {
              id: driverProfile.user_driverprofile_userIdTouser.id,
              name: driverProfile.user_driverprofile_userIdTouser.name,
              email: driverProfile.user_driverprofile_userIdTouser.email,
              phone: driverProfile.user_driverprofile_userIdTouser.phone,
              avatar: driverProfile.user_driverprofile_userIdTouser.avatar,
              isActive: driverProfile.user_driverprofile_userIdTouser.isActive,
            },
          }
          : null,
        agreement: car.agreement,
        statistics: {
          totalAgreements: car._count.agreement,
          activeAgreements: car.agreement.length,
          totalInsurance: car._count.insurance,
          totalPayments: car._count.weeklypayment,
          totalMaintenance: car._count.maintenancerequest,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedCars,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch cars",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { messsage: "unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json();

    // Validate required fields
    if (!body.registration || !body.model || !body.make || !body.purchasePrice) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration, model, make, and purchase price are required",
        },
        { status: 400 }
      );
    }

    // Check if registration already exists
    const existingCar = await prisma.car.findUnique({
      where: { registration: body.registration },
    });

    if (existingCar && !existingCar.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "A car with this registration already exists",
        },
        { status: 409 }
      );
    }

    // Prepare data with avatar
    const carData: any = {
      registration: body.registration,
      model: body.model,
      make: body.make,
      year: body.year || null,
      bodyType : body.bodyType || null,
      color: body.color || null,
      purchasePrice: body.purchasePrice,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      currentValue: body.currentValue || body.purchasePrice,
      status: body.status || "AVAILABLE",
      isActive: body.isActive !== undefined ? body.isActive : true,
      driverProfileId: body.driverProfileId || null,
      updatedAt: new Date(),
    };

    // Add avatar if provided
    if (body.avatar && typeof body.avatar === 'string' && body.avatar.trim() !== '') {
      carData.avatar = body.avatar;
    }

    // Create car
    const car = await prisma.car.create({
      data: carData,
    });

    // Create audit log
    await prisma.auditlog.create({
      data: {
        action: "CREATE",
        entity: "CAR",
        entityId: car.id,
        newValues: JSON.stringify(car),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Car created successfully",
      data: car,
    });
  } catch (error: any) {
    console.error("Error creating car:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create car",
        error: error.message,
      },
      { status: 500 }
    );
  }
}