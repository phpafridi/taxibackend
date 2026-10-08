import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth-config";
import { prisma } from "../../../../../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driverprofile.findUnique({
      where: { userId: Number(session.user.id) },
      select: { id: true },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 404 }
      );
    }

    const driverId = driver.id;

    const [
      totalCars,
      totalAgreements,
      totalLedger,
    ] = await Promise.all([
      prisma.car.count({ where: { driverProfileId: Number(driverId) } }),
      prisma.agreement.count({ where: { driverId } }),
      prisma.ledger.count({ where: { driverId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalCars,
        totalAgreements,
        totalLedger,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
