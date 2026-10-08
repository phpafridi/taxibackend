// app/api/ledger/route.ts
import { prisma } from "../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth-config'; // Adjust path as needed


// Type for creating ledger entry
interface LedgerCreateInput {
  ownerType: 'OWNER' | 'DRIVER' | 'COMPANY';
  ownerId: number;
  category: 'CAR_PURCHASE' | 'INSURANCE' | 'INSURANCE_DRIVER_PAYMENT' | 'WEEKLY_INCOME' | 'MAINTENANCE_EXPENSE' | 'MAINTENANCE_REIMBURSEMENT' | 'ADJUSTMENT' | 'REFUND' | 'DEPOSIT' | 'FINE' | 'OTHER';
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  carId?: number | null;
  driverId?: number | null;
  agreementId?: number | null;
  maintenanceId?: number | null;
  insurancePaymentId?: number | null;
  weeklyPaymentId?: number | null;
  referenceId?: number | null;
  referenceType?: string | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  createdBy?: number | null;
}

// GET all ledger entries
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    // Filter by direction
    const direction = searchParams.get('direction');
    if (direction) where.direction = direction;
    
    // Filter by category
    const category = searchParams.get('category');
    if (category) where.category = category;
    
    // Filter by owner type
    const ownerType = searchParams.get('ownerType');
    if (ownerType) where.ownerType = ownerType;

    // Optional: Filter by logged-in user's entries
    const myEntriesOnly = searchParams.get('myEntries');
    if (myEntriesOnly === 'true') {
      // Get all entries where this user is involved
      where.OR = [
        { ownerId: user.id, ownerType: 'OWNER' },
        { driverId: user.id },
        { createdBy: user.id }
      ];
    }

    const [ledger, total] = await Promise.all([
      prisma.ledger.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.ledger.count({ where })
    ]);

    // Convert Decimal to numbers for easier handling in frontend
    const transformedLedger = ledger.map(entry => ({
      id: entry.id,
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      carId: entry.carId,
      driverId: entry.driverId,
      agreementId: entry.agreementId,
      maintenanceId: entry.maintenanceId,
      insurancePaymentId: entry.insurancePaymentId,
      weeklyPaymentId: entry.weeklyPaymentId,
      category: entry.category,
      direction: entry.direction,
      amount: Number(entry.amount),
      description: entry.description,
      balanceBefore: entry.balanceBefore ? Number(entry.balanceBefore) : 0,
      balanceAfter: entry.balanceAfter ? Number(entry.balanceAfter) : 0,
      paymentMethod: entry.paymentMethod,
      paymentDate: entry.paymentDate,
      isReconciled: entry.isReconciled,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      referenceId: entry.referenceId,
      referenceType: entry.referenceType
    }));

    return NextResponse.json({
      success: true,
      data: transformedLedger,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST new ledger entry
// POST new ledger entry - FIXED VERSION
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.category || !body.direction || !body.amount || !body.description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: category, direction, amount, description' },
        { status: 400 }
      );
    }

    // Validate amount is positive number
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate ownerType
    const ownerType = body.ownerType || 'OWNER';
    if (!['OWNER', 'DRIVER', 'COMPANY'].includes(ownerType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid owner type value' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = [
      'CAR_PURCHASE',
      'INSURANCE',
      'INSURANCE_DRIVER_PAYMENT',
      'WEEKLY_INCOME',
      'MAINTENANCE_EXPENSE',
      'MAINTENANCE_REIMBURSEMENT',
      'ADJUSTMENT',
      'REFUND',
      'DEPOSIT',
      'FINE',
      'OTHER'
    ];
    
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category value' },
        { status: 400 }
      );
    }

    // Validate direction
    if (body.direction !== 'CREDIT' && body.direction !== 'DEBIT') {
      return NextResponse.json(
        { success: false, message: 'Invalid direction value' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Handle ownerId properly for all owner types
    let ledgerOwnerId: number;
    let driverIdForLedger: number | null = null;
    let userIdForOwner: number;

    if (ownerType === 'DRIVER') {
      // body.driverId is driverProfile.id (from the resources dropdown)
      // body.ownerId may also be set but we resolve from driverId first
      let driverProfile = null;

      const profileIdFromDriver = body.driverId ? parseInt(body.driverId) : null;
      const profileIdFromOwner  = body.ownerId  ? parseInt(body.ownerId)  : null;

      // Try driverId first (most reliable — it's the profile id from the dropdown)
      if (profileIdFromDriver && profileIdFromDriver > 0) {
        driverProfile = await prisma.driverprofile.findUnique({
          where: { id: profileIdFromDriver },
        });
      }

      // Fall back to ownerId — could be profile.id or userId
      if (!driverProfile && profileIdFromOwner && profileIdFromOwner > 0) {
        driverProfile = await prisma.driverprofile.findFirst({
          where: {
            OR: [
              { id: profileIdFromOwner },
              { userId: profileIdFromOwner },
            ],
          },
        });
      }

      if (!driverProfile) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Driver profile not found. Provided ownerId: ${body.ownerId}, driverId: ${body.driverId}` 
          },
          { status: 404 }
        );
      }

      // For ledger.ownerId, we ALWAYS store driverProfile.id
      ledgerOwnerId = driverProfile.id;
      
      // For createdBy and user reference, we need the userId
      userIdForOwner = driverProfile.userId;
      
      // Also store in driverId field
      driverIdForLedger = driverProfile.id;
      
    } else if (ownerType === 'OWNER') {
      // For OWNER type, ownerId should be userId
      const ownerId = parseInt(body.ownerId);
      if (isNaN(ownerId) || ownerId <= 0) {
        return NextResponse.json(
          { success: false, message: 'Valid owner ID is required for OWNER type' },
          { status: 400 }
        );
      }

      // Check if owner exists
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
      });
      
      if (!owner) {
        return NextResponse.json(
          { success: false, message: `Owner (user) not found with ID: ${ownerId}` },
          { status: 404 }
        );
      }
      
      ledgerOwnerId = ownerId;
      userIdForOwner = ownerId;
      
    } else if (ownerType === 'COMPANY') {
      // For COMPANY type, use the provided ID
      const companyId = parseInt(body.ownerId || '1');
      ledgerOwnerId = companyId;
      userIdForOwner = companyId;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid owner type' },
        { status: 400 }
      );
    }

    // Validate car exists if carId is provided
    let carIdForLedger: number | null = null;
    if (body.carId && !isNaN(parseInt(body.carId)) && parseInt(body.carId) > 0) {
      const carId = parseInt(body.carId);
      const carExists = await prisma.car.findUnique({
        where: { id: carId },
      });
      
      if (!carExists) {
        return NextResponse.json(
          { success: false, message: `Car not found with ID: ${carId}` },
          { status: 404 }
        );
      }
      carIdForLedger = carId;
    }

    // Calculate balance using the correct ownerId
    const previousEntry = await prisma.ledger.findFirst({
      where: {
        ownerType: ownerType,
        ownerId: ledgerOwnerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const balanceBefore = previousEntry?.balanceAfter 
      ? Number(previousEntry.balanceAfter) 
      : 0;
    
    const balanceAfter = body.direction === 'CREDIT' 
      ? balanceBefore + amount 
      : balanceBefore - amount;

    // Prepare ledger data
    const ledgerData: any = {
      ownerType: ownerType,
      ownerId: ledgerOwnerId,
      category: body.category,
      direction: body.direction,
      amount: amount,
      description: body.description,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      paymentMethod: body.paymentMethod || null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      createdBy: user.id, // Always use logged-in user as createdBy
      referenceId: body.referenceId ? parseInt(body.referenceId) : null,
      referenceType: body.referenceType || null,
      status: body.status || 'ACCEPT', // 🔴 ADD STATUS FIELD
      updatedAt: new Date(),
    };

    // Add carId if provided
    if (carIdForLedger) {
      ledgerData.carId = carIdForLedger;
    }

    // Set driverId only for DRIVER ownerType
    if (ownerType === 'DRIVER' && driverIdForLedger) {
      ledgerData.driverId = driverIdForLedger;
    }

    // Add other optional fields
    const optionalFields = ['agreementId', 'maintenanceId', 'insurancePaymentId', 'weeklyPaymentId'];
    for (const field of optionalFields) {
      if (body[field] && !isNaN(parseInt(body[field]))) {
        ledgerData[field] = parseInt(body[field]);
      }
    }

    const ledger = await prisma.ledger.create({
      data: ledgerData
    });

    // Push notification to driver when admin creates a DEBIT charge
    if (user.role === 'ADMIN' && body.direction === 'DEBIT' && driverIdForLedger) {
      const CAT_LABEL: Record<string, string> = {
        WEEKLY_INCOME: 'Weekly Rent', MAINTENANCE_EXPENSE: 'Maintenance Charge',
        INSURANCE: 'Insurance Charge', INSURANCE_DRIVER_PAYMENT: 'Insurance Payment Due',
        FINE: 'Fine', DEPOSIT: 'Deposit Due', ADJUSTMENT: 'Adjustment', REFUND: 'Refund', OTHER: 'Charge',
      };
      const chargeLabel = CAT_LABEL[body.category] || body.category.replace(/_/g, ' ');
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const cookie = request.headers.get('cookie') || '';
      try {
        await fetch(`${baseUrl}/api/notification/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({
            driverId: driverIdForLedger,
            notification: {
              title: `Charge Added - ${chargeLabel} - GBP ${amount.toFixed(2)}`,
              body: body.description || `A charge of GBP ${amount.toFixed(2)} has been added to your account.`,
            },
            data: {
              type: 'LEDGER_CHARGE',
              ledgerId: ledger.id.toString(),
              amount: amount.toString(),
              category: body.category,
              url: '/driver-portal/ledger',
            },
          }),
        });
        console.log(`[ledger POST] Push sent to driver ${driverIdForLedger} for ${chargeLabel}`);
      } catch (notifErr) {
        console.error('[ledger POST] Failed to send push notification:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ledger entry created successfully',
      data: {
        id: ledger.id,
        ownerType: ledger.ownerType,
        ownerId: ledger.ownerId,
        driverId: ledger.driverId,
        carId: ledger.carId,
        amount: Number(ledger.amount),
        direction: ledger.direction,
        category: ledger.category,
        description: ledger.description,
        balanceAfter: ledger.balanceAfter ? Number(ledger.balanceAfter) : 0,
        createdAt: ledger.createdAt,
        createdBy: user.id
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating ledger entry:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Foreign key constraint failed. The referenced record does not exist.',
          details: error.meta?.field_name ? `Field: ${error.meta.field_name}` : undefined
        },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Duplicate entry detected'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to create ledger entry',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}