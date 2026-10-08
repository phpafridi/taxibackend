import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../lib/prisma";


export async function GET(request: NextRequest) {
  try {
    // Get total ledger stats
    const ledger = await prisma.ledger.findMany({
      select: {
        direction: true,
        amount: true,
        category: true,
      }
    });

    const totalCredit = ledger
      .filter(l => l.direction === 'CREDIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const totalDebit = ledger
      .filter(l => l.direction === 'DEBIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const netBalance = totalCredit - totalDebit;

    // Get active cars count
    const activeCars = await prisma.car.count({
      where: { isActive: true }
    });

    // Get active drivers count
    const activeDrivers = await prisma.driverprofile.count({
      where: { isActive: true }
    });

    // Get weekly income (WEEKLY_INCOME category)
    const weeklyIncome = ledger
      .filter(l => l.category === 'WEEKLY_INCOME' && l.direction === 'CREDIT')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCredit,
        totalDebit,
        netBalance,
        activeCars,
        activeDrivers,
        weeklyIncome
      }
    });

  } catch (error: any) {
    console.error('Error fetching ledger overview summary:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ledger summary' },
      { status: 500 }
    );
  }
}