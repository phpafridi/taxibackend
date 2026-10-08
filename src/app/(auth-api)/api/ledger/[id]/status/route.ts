import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { status, rejectionReason, skipAutoDebit } = body;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transactionId = parseInt(id);
    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }

    if (!status || !['ACCEPT', 'PENDING', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value. Must be ACCEPT, PENDING, or REJECTED' },
        { status: 400 }
      );
    }

    const existingTransaction = await prisma.ledger.findUnique({
      where: { id: transactionId },
      include: {
        car: true,
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true,
          },
        },
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: `Transaction with ID ${transactionId} not found` },
        { status: 404 }
      );
    }

    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedTransaction = await prisma.ledger.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        car: true,
        driverprofile: {
          include: {
            user_driverprofile_userIdTouser: true,
          },
        },
        agreement: true,
        user: true,
      },
    });

    // ✅ AUTO DEBIT CREATION - WEEKLY_INCOME only
    // Skipped when admin confirms amount manually via frontend modal (skipAutoDebit: true)
    if (
      !skipAutoDebit &&
      status === 'ACCEPT' &&
      existingTransaction.direction === 'CREDIT' &&
      existingTransaction.category === 'WEEKLY_INCOME' &&
      existingTransaction.driverId &&
      existingTransaction.driverprofile
    ) {
      const firstDebitEntry = await prisma.ledger.findFirst({
        where: {
          driverId: existingTransaction.driverId,
          carId: existingTransaction.carId,
          category: 'WEEKLY_INCOME',
          direction: 'DEBIT',
          status: 'ACCEPT',
        },
        orderBy: { createdAt: 'asc' },
      });

      const debitAmount = firstDebitEntry
        ? firstDebitEntry.amount
        : existingTransaction.amount;

      await prisma.ledger.create({
        data: {
          ownerType: 'DRIVER',
          ownerId: existingTransaction.ownerId,
          driverId: existingTransaction.driverId,
          carId: existingTransaction.carId,
          category: 'WEEKLY_INCOME',
          direction: 'DEBIT',
          amount: debitAmount,
          description: 'Weekly Rent Due For Next Week',
          paymentMethod: 'AUTO',
          paymentDate: new Date(),
          status: 'ACCEPT',
          referenceId: transactionId,
          referenceType: 'AUTO_WEEKLY_DEBIT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`[AUTO DEBIT] WEEKLY_INCOME debit created for driver ${existingTransaction.driverId}, amount: ${debitAmount}`);
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    // Notification for driver about status update
    await prisma.notification.create({
      data: {
        type: 'WEEKLY_PAYMENT_PAID',
        priority: 'HIGH',
        title: 'PAYMENT STATUS UPDATED',
        message: `YOUR PAYMENT HAS BEEN ${status}`,
        referenceType: 'LEDGER_UPDATE',
        referenceId: transactionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isForAdmin: false,
        driverId: existingTransaction.driverId!,
      },
    });

    // Extra notification if WEEKLY_INCOME was accepted (next week due)
    if (
      status === 'ACCEPT' &&
      existingTransaction.category === 'WEEKLY_INCOME' &&
      existingTransaction.direction === 'CREDIT' &&
      existingTransaction.driverprofile
    ) {
      await prisma.notification.create({
        data: {
          type: 'WEEKLY_PAYMENT_DUE',
          priority: 'HIGH',
          title: 'WEEKLY PAYMENT DUE FOR NEXT WEEK',
          message: 'YOUR WEEKLY PAYMENT DUE IS GENERATED FOR NEXT WEEK',
          referenceType: 'LEDGER_UPDATE',
          actionUrl: '/driver-portal/ledger',
          createdAt: new Date(),
          updatedAt: new Date(),
          isForAdmin: false,
          driverId: existingTransaction.driverId!,
        },
      });
    }

    // Push notifications
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cookie = request.headers.get('cookie') || '';
    try {
      await fetch(`${baseUrl}/api/notification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          driverId: existingTransaction.driverId,
          notification: {
            title: 'PAYMENT STATUS UPDATED',
            body: `YOUR PAYMENT HAS BEEN ${status}. Check Your Ledger For Details`,
          },
          data: {
            type: 'PAYMENT_STATUS_UPDATE',
            transactionId: transactionId.toString(),
            status,
            url: '/driver-portal/ledger',
          },
        }),
      });

      if (
        status === 'ACCEPT' &&
        existingTransaction.category === 'WEEKLY_INCOME' &&
        existingTransaction.direction === 'CREDIT' &&
        existingTransaction.driverprofile
      ) {
        await fetch(`${baseUrl}/api/notification/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: existingTransaction.driverId,
            notification: {
              title: 'WEEKLY PAYMENT DUE FOR NEXT WEEK',
              body: 'YOUR WEEKLY PAYMENT DUE IS GENERATED FOR NEXT WEEK',
            },
            data: {
              type: 'WEEKLY_PAYMENT_DUE',
              amount: existingTransaction.amount.toString(),
              url: '/driver/ledger',
            },
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }

    try {
      await prisma.auditlog.create({
        data: {
          action: 'LEDGER_STATUS_UPDATE',
          entity: 'ledger',
          entityId: transactionId,
          oldValues: JSON.stringify({ status: existingTransaction.status }),
          newValues: JSON.stringify({ status }),
          changes: `Status changed from ${existingTransaction.status} to ${status}`,
          createdAt: new Date(),
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedTransaction,
      message: `Transaction status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating transaction status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update transaction status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
