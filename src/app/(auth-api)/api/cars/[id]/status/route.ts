// app/api/cars/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth-config";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { messsage: "unauthorized" },
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

    if (body.isActive === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "isActive field is required",
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
      select: {
        id: true,
        isActive: true,
        status: true,
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

    // Check for active agreements
    if (existingCar.isActive && !body.isActive) {
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
            message: "Cannot deactivate car with active agreements. Please terminate agreements first.",
          },
          { status: 400 }
        );
      }
    }

    // Update car status
    const updatedCar = await prisma.car.update({
      where: { id },
      data: {
        isActive: body.isActive,
        status: body.isActive ? existingCar.status : "INACTIVE",
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditlog.create({
      data: {
        action: "STATUS_CHANGE",
        entity: "CAR",
        entityId: id,
        oldValues: JSON.stringify({ isActive: existingCar.isActive }),
        newValues: JSON.stringify({ isActive: body.isActive }),
        changes: JSON.stringify({ isActive: body.isActive }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Car ${body.isActive ? "activated" : "deactivated"} successfully`,
      data: updatedCar,
    });
  } catch (error: any) {
    console.error("Error updating car status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update car status",
        error: error.message,
      },
      { status: 500 }
    );
  }
}