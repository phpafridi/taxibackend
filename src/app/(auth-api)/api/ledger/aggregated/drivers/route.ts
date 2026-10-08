import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "../../../../../../../lib/prisma";


export async function GET(request: NextRequest) {
  try {
    const drivers = await prisma.driverprofile.findMany({
      where: { isActive: true },
      include: {
        user_driverprofile_userIdTouser: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        car: {
          select: {
            registration: true,
            make: true,
            model: true
          }
        },
        ledger: {
          where: {
            OR: [
              { category: 'WEEKLY_INCOME' },
              { category: 'INSURANCE_DRIVER_PAYMENT' }
            ]
          },
          select: {
            direction: true,
            amount: true,
            category: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    const driverLedgers = drivers.map(driver => {
      const ledgerEntries = driver.ledger || [];
      
      // Calculate totals
      const weeklyPayments = ledgerEntries
        .filter(l => l.category === 'WEEKLY_INCOME' && l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const insurancePayments = ledgerEntries
        .filter(l => l.category === 'INSURANCE_DRIVER_PAYMENT' && l.direction === 'DEBIT')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      const totalPaid = weeklyPayments + insurancePayments;
      
      // Calculate expected weekly payments (based on weekly amount)
      const weeklyAmount = Number(driver.weeklyAmount) || 0;
      const weeksSinceStart = driver.createdAt ? 
        Math.ceil((Date.now() - new Date(driver.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0;
      
      const expectedTotal = weeklyAmount * weeksSinceStart;
      const balanceDue = Math.max(0, expectedTotal - totalPaid);

      const lastPayment = ledgerEntries
        .filter(l => l.direction === 'DEBIT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: driver.id,
        name: driver.user_driverprofile_userIdTouser?.name,
        email: driver.user_driverprofile_userIdTouser?.email,
        phone: driver.user_driverprofile_userIdTouser?.phone,
        isActive: driver.isActive,
        isVerified: driver.isVerified,
        weeklyAmount: weeklyAmount,
        carRegistration: driver.car?.[0]?.registration,
        carModel: `${driver.car?.[0]?.make || ''} ${driver.car?.[0]?.model || ''}`.trim(),
        totalPaid,
        weeklyPayments,
        insurancePayments,
        balanceDue,
        lastPaymentDate: lastPayment?.createdAt || null,
        paymentCount: ledgerEntries.length,
        joinedDate: driver.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: driverLedgers
    });

  } catch (error: any) {
    console.error('Error fetching aggregated driver ledgers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch driver ledgers' },
      { status: 500 }
    );
  }
}