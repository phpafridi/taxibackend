import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../../lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const weeklyPayments = await prisma.weeklypayment.findMany({
      where: {
        status: { in: ['PENDING', 'PAID', 'OVERDUE'] }
      },
      include: {
        car: {
          select: {
            registration: true,
            make: true,
            model: true
          }
        },
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        weekStart: 'desc'
      },
      take: 20
    });

    const formattedPayments = weeklyPayments.map(payment => ({
      id: payment.id,
      weekStart: payment.weekStart,
      weekEnd: payment.weekEnd,
      carRegistration: payment.car.registration,
      carModel: `${payment.car.make} ${payment.car.model}`,
      driverName: payment.driverprofile.user_driverprofile_userIdTouser?.name,
      amount: Number(payment.amount),
      status: payment.status,
      paidAt: payment.paidAt,
      dueDate: payment.dueDate
    }));

    return NextResponse.json({
      success: true,
      data: formattedPayments
    });

  } catch (error: any) {
    console.error('Error fetching weekly ledgers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch weekly ledgers' },
      { status: 500 }
    );
  }
}