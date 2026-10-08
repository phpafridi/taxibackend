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
          select: {
            direction: true,
            amount: true,
            category: true,
            createdAt: true
          }
        },
        weeklypayment: {
          where: { status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
          take: 1
        }
      }
    });

    const driverLedgers = drivers.map(driver => {
      const ledgerEntries = driver.ledger || [];
      
      const totalPaid = ledgerEntries
        .filter(l => l.direction === 'DEBIT' && 
                   (l.category === 'WEEKLY_INCOME' || l.category === 'INSURANCE_DRIVER_PAYMENT'))
        .reduce((sum, l) => sum + Number(l.amount), 0);

      const balanceDue = ledgerEntries
        .filter(l => l.direction === 'CREDIT' && l.category === 'WEEKLY_INCOME')
        .reduce((sum, l) => sum + Number(l.amount), 0) - totalPaid;

      const lastPayment = ledgerEntries
        .filter(l => l.direction === 'DEBIT')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const nextDue = driver.weeklypayment[0];

      return {
        id: driver.id,
        name: driver.user_driverprofile_userIdTouser?.name,
        email: driver.user_driverprofile_userIdTouser?.email,
        phone: driver.user_driverprofile_userIdTouser?.phone,
        isActive: driver.isActive,
        carRegistration: driver.car?.[0]?.registration,
        carModel: driver.car?.[0]?.model,
        totalPaid,
        balanceDue: balanceDue > 0 ? balanceDue : 0,
        lastPaymentDate: lastPayment?.createdAt || null,
        nextDueDate: nextDue?.dueDate || null,
        ledgerCount: ledgerEntries.length
      };
    });

    return NextResponse.json({
      success: true,
      data: driverLedgers
    });

  } catch (error: any) {
    console.error('Error fetching driver ledgers:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch driver ledgers' },
      { status: 500 }
    );
  }
}