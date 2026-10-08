import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../../../lib/prisma";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    // Await the params promise
    const { carId: carIdStr } = await params;
    const carId = parseInt(carIdStr);
    
    if (isNaN(carId)) {
      return NextResponse.json(
        { success: false, message: "Invalid car ID" },
        { status: 400 }
      );
    }

    // Get the car
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!car) {
      return NextResponse.json(
        { success: false, message: "Car not found" },
        { status: 404 }
      );
    }

    // Get all ledger entries for this car
    const transactions = await prisma.ledger.findMany({
      where: { carId: carId },
      include: {
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the data
    const formattedCar = {
      id: car.id,
      registration: car.registration,
      make: car.make,
      model: car.model,
      year: car.year,
      status: car.status,
      isActive: car.isActive,
      driverName: car.driverprofile?.user_driverprofile_userIdTouser?.name,
      driverId: car.driverprofile?.id
    };

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      createdAt: transaction.createdAt,
      paymentDate: transaction.paymentDate,
      direction: transaction.direction,
      category: transaction.category,
      amount: Number(transaction.amount),
      description: transaction.description,
      balanceBefore: transaction.balanceBefore ? Number(transaction.balanceBefore) : 0,
      balanceAfter: transaction.balanceAfter ? Number(transaction.balanceAfter) : 0,
      paymentMethod: transaction.paymentMethod,
      isReconciled: transaction.isReconciled,
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId,
      driverprofile: transaction.driverprofile ? {
        id: transaction.driverprofile.id,
        user: transaction.driverprofile.user_driverprofile_userIdTouser
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        car: formattedCar,
        transactions: formattedTransactions
      }
    });

  } catch (error: any) {
    console.error('Error fetching car transactions:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch car transactions' },
      { status: 500 }
    );
  }
}