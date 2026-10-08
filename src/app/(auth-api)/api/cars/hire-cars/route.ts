// app/api/cars/hire-cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get cars where HIRE === false
    const cars = await prisma.car.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        HIRE: false,  // Direct filter on HIRE field
      },
      select: {
        id: true,
        registration: true,
        model: true,
        make: true,
        year: true,
        color: true,
        avatar: true,
        bodyType: true,
      },
      orderBy: {
        registration: 'asc',
      },
    });

    // Format for dropdown
    const formattedCars = cars.map(car => ({
      id: car.id,
      registration: car.registration,
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      bodyType: car.bodyType,
      // For React Select compatibility
      label: `${car.registration} - ${car.make} ${car.model}${car.year ? ` (${car.year})` : ''}`,
      value: car.id,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCars,
      count: cars.length,
    });

  } catch (error: any) {
    console.error("Error fetching hire cars:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch cars where HIRE = false",
        error: error.message,
      },
      { status: 500 }
    );
  }
}