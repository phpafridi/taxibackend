import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../../lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const cars = await prisma.car.findMany({
      where: { isActive: true },
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
        },
        ledger: {
          select: {
            direction: true,
            amount: true,
            category: true,
            createdAt: true
          }
        }
      }
    });

    const carLedgers = cars.map(car => {
      const ledgerEntries = car.ledger || [];
      
      const totalIncome = ledgerEntries
        .filter(l => l.direction === 'CREDIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const totalExpenses = ledgerEntries
        .filter(l => l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);

      const lastPayment = ledgerEntries
        .filter(l => l.direction === 'CREDIT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: car.id,
        registration: car.registration,
        make: car.make,
        model: car.model,
        year: car.year,
        status: car.status,
        driverName: car.driverprofile?.user_driverprofile_userIdTouser?.name,
        driverId: car.driverprofile?.id,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        lastPaymentDate: lastPayment?.createdAt || null,
        ledgerCount: ledgerEntries.length
      };
    });

    return NextResponse.json({
      success: true,
      data: carLedgers
    });

  } catch (error: any) {
    console.error('Error fetching car ledgers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch car ledgers' },
      { status: 500 }
    );
  }
}