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
      },
      orderBy: {
        registration: 'asc'
      }
    });

    const carLedgers = cars.map(car => {
      const ledgerEntries = car.ledger || [];
      
      // Calculate totals by category
      const weeklyIncome = ledgerEntries
        .filter(l => l.category === 'WEEKLY_INCOME' && l.direction === 'CREDIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const otherIncome = ledgerEntries
        .filter(l => l.category !== 'WEEKLY_INCOME' && l.direction === 'CREDIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const totalIncome = weeklyIncome + otherIncome;
      
      const maintenanceExpenses = ledgerEntries
        .filter(l => l.category === 'MAINTENANCE_EXPENSE' && l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const insuranceExpenses = ledgerEntries
        .filter(l => l.category === 'INSURANCE' && l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const otherExpenses = ledgerEntries
        .filter(l => !['MAINTENANCE_EXPENSE', 'INSURANCE'].includes(l.category) && l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const totalExpenses = maintenanceExpenses + insuranceExpenses + otherExpenses;

      const lastTransaction = ledgerEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: car.id,
        registration: car.registration,
        make: car.make,
        model: car.model,
        year: car.year,
        purchasePrice: Number(car.purchasePrice),
        currentValue: car.currentValue ? Number(car.currentValue) : null,
        status: car.status,
        isActive: car.isActive,
        driverName: car.driverprofile?.user_driverprofile_userIdTouser?.name,
        driverId: car.driverprofile?.id,
        weeklyAmount: car.driverprofile?.weeklyAmount ? Number(car.driverprofile.weeklyAmount) : null,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        weeklyIncome,
        maintenanceExpenses,
        insuranceExpenses,
        lastTransactionDate: lastTransaction?.createdAt || null,
        transactionCount: ledgerEntries.length
      };
    });

    return NextResponse.json({
      success: true,
      data: carLedgers
    });

  } catch (error: any) {
    console.error('Error fetching aggregated car ledgers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch car ledgers' },
      { status: 500 }
    );
  }
}