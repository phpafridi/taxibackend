// app/api/driver-portal/ledger/route.ts - COMPLETE WORKING VERSION
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';


// Helper function to convert Decimal to number
const decimalToNumber = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }
  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }
  return 0;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Please login to view your ledger' },
        { status: 401 }
      );
    }

    const driverProfile = await prisma.driverprofile.findUnique({
      where: { userId: parseInt(session.user.id) },
      select: { id: true }
    });

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const ledgerEntries = await prisma.ledger.findMany({
      where: {
        OR: [
          { ownerType: 'DRIVER', ownerId: driverProfile.id },
          { driverId: driverProfile.id },
        ]
      },
      include: {
        car: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    const totalCredit = ledgerEntries
      .filter(entry => entry.direction === 'CREDIT')
      .reduce((sum, entry) => sum + decimalToNumber(entry.amount), 0);

    const totalDebit = ledgerEntries
      .filter(entry => entry.direction === 'DEBIT')
      .reduce((sum, entry) => sum + decimalToNumber(entry.amount), 0);

    const statistics = {
      totalCredit,
      totalDebit,
      netBalance: totalCredit - totalDebit,
      totalEntries: ledgerEntries.length
    };

    const formattedEntries = ledgerEntries.map(entry => ({
      ...entry,
      amount: decimalToNumber(entry.amount),
      balanceBefore: entry.balanceBefore ? decimalToNumber(entry.balanceBefore) : null,
      balanceAfter: entry.balanceAfter ? decimalToNumber(entry.balanceAfter) : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedEntries,
      statistics,
      message: 'Driver ledger fetched successfully'
    });

  } catch (error: any) {
    console.error('Error fetching driver ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'DRIVER') return NextResponse.json({ error: 'Only drivers can add ledger entries' }, { status: 403 });

    const body = await request.json();
    const { type, amount, category, description, paymentDate, paymentMethod } = body;

    if (!type || !['CREDIT', 'DEBIT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const driverProfile = await prisma.driverprofile.findUnique({ 
      where: { userId: parseInt(session.user.id) },
      include: {
        user_driverprofile_userIdTouser: { select: { name: true } }
      }
    });

    if (!driverProfile) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });

    const driverId = driverProfile.id;
    const driverName = driverProfile.user_driverprofile_userIdTouser?.name || 'Unknown';

    const assignedCar = await prisma.car.findFirst({
      where: { driverProfileId: driverId, isActive: true },
      select: { id: true }
    });

    // Create ledger entry using transaction
    const result = await prisma.$transaction(async (tx) => {
      const ledgerEntry = await tx.ledger.create({
        data: {
          ownerType: 'DRIVER',
          ownerId: driverId,
          carId: assignedCar?.id || null,
          driverId: driverId,
          category: category,
          direction: type,
          amount: parseFloat(amount),
          description: description.trim(),
          paymentMethod: paymentMethod || 'CASH',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          createdBy: parseInt(session.user.id),
          updatedAt: new Date(),
          status: 'PENDING'
        }
      });

      await tx.auditlog.create({
        data: {
          driverId: driverId,
          action: 'CREATE',
          entity: 'LEDGER',
          entityId: ledgerEntry.id,
          newValues: JSON.stringify({
            type: type,
            amount: amount,
            category: category,
            description: description
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      });

      const adminUsers = await tx.user.findMany({ 
        where: { role: 'ADMIN', isActive: true }, 
        select: { id: true } 
      });

      const message = `APPROVE YOUR WEEKLY PAYMENT HAS BEEN PAID BY ${driverName.toUpperCase()}`;

      await Promise.all(adminUsers.map(admin =>
        tx.notification.create({
          data: {
            type: 'WEEKLY_PAYMENT_PAID',
            priority: 'HIGH',
            title: 'WEEKLY PAYMENT PENDING',
            message: message,
            referenceType: 'LEDGER_ENTRY',
            referenceId: ledgerEntry.id,
            actionUrl: '/ledger',
            isForAdmin: true,
            userId: admin.id,
            driverId: driverId,
            updatedAt: new Date(),
          },
        })
      ));

      return { ledgerEntry, driverName: driverName };
    });

    // Send FCM notifications
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const cookie = request.headers.get('cookie') || '';

      await fetch(`${baseUrl}/api/notification/send-to-admins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Cookie': cookie 
        },
        body: JSON.stringify({
          notification: { 
            title: 'WEEKLY PAYMENT PAID', 
            body: `APPROVE YOUR WEEKLY PAYMENT HAS BEEN PAID BY ${result.driverName.toUpperCase()}` 
          },
          data: { 
            type: 'WEEKLY_PAYMENT_PAID', 
            ledgerId: result.ledgerEntry.id.toString(), 
            url: '/ledger',
            driverName: result.driverName,
            amount: amount.toString(),
          },
        }),
      });
    } catch (err) {
      console.error('Failed to send admin notifications:', err);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ledger entry added successfully', 
      data: result.ledgerEntry 
    });

  } catch (error: any) {
    console.error('Error adding ledger entry:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to add ledger entry' 
    }, { status: 500 });
  }
}