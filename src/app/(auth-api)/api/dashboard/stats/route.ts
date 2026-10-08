import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function GET() {
  try {
    const [
      totalCars,
      totalDrivers,
      totalAgreements,
      totalLedger,
    ] = await Promise.all([
      prisma.car.count(),
      prisma.driverprofile.count(),
      prisma.agreement.count(),
      prisma.ledger.count({
        where: {
          status: "PENDING"
        }
      })
    ]);

    return NextResponse.json({
      totalCars,
      totalDrivers,
      totalAgreements,
      totalLedger,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
