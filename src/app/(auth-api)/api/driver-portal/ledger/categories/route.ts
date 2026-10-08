// app/api/driver-portal/ledger/categories/route.ts
// Returns ALL admin categories so drivers can pay any category, even if they have no ledger yet
import { prisma } from "../../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../../lib/auth-config';


// All categories that admin can record – driver should be able to pay any of these
const ALL_CATEGORIES = [
  'WEEKLY_INCOME',
  'MAINTENANCE_EXPENSE',
  'MAINTENANCE_REIMBURSEMENT',
  'INSURANCE',
  'INSURANCE_DRIVER_PAYMENT',
  'DEPOSIT',
  'FINE',
  'REFUND',
  'ADJUSTMENT',
  'OTHER',
];

const CATEGORY_LABELS: Record<string, string> = {
  WEEKLY_INCOME: 'Weekly Rent',
  MAINTENANCE_EXPENSE: 'Maintenance',
  MAINTENANCE_REIMBURSEMENT: 'Maintenance Refund',
  INSURANCE: 'Insurance',
  INSURANCE_DRIVER_PAYMENT: 'Insurance Payment',
  CAR_PURCHASE: 'Car Purchase',
  DEPOSIT: 'Deposit',
  FINE: 'Fine',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
  OTHER: 'Other',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please login' }, { status: 401 });
    }

    const driverProfile = await prisma.driverprofile.findUnique({
      where: { userId: parseInt(session.user.id) },
      select: { id: true },
    });

    if (!driverProfile) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    // Categories the driver already has ledger entries for
    const existingEntries = await prisma.ledger.findMany({
      where: { ownerType: 'DRIVER', ownerId: driverProfile.id },
      distinct: ['category'],
      select: { category: true },
    });

    const existingCategories = existingEntries
      .map((e) => e.category)
      .filter(Boolean) as string[];

    // Merge: ALL_CATEGORIES first, then any extra the driver already has
    const merged = Array.from(
      new Set([...ALL_CATEGORIES, ...existingCategories])
    );

    // Build enriched list with labels
    const categories = merged.map((value) => ({
      value,
      label: CATEGORY_LABELS[value] || value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      hasEntries: existingCategories.includes(value),
    }));

    return NextResponse.json({
      success: true,
      categories,
      message: 'Driver categories fetched successfully',
    });
  } catch (error: any) {
    console.error('Error fetching driver categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
