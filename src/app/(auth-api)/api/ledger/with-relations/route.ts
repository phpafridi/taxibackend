// app/api/ledger/with-relations/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    const ledger = await prisma.ledger.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        car: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true
          }
        },
        driverprofile: {
          select: {
            id: true,
            user_driverprofile_userIdTouser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        agreement: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Transform the data to include user in a simpler format
    const transformedLedger = ledger.map(entry => ({
      ...entry,
      amount: Number(entry.amount),
      balanceBefore: entry.balanceBefore ? Number(entry.balanceBefore) : 0,
      balanceAfter: entry.balanceAfter ? Number(entry.balanceAfter) : 0,
      driverprofile: entry.driverprofile ? {
        id: entry.driverprofile.id,
        user: entry.driverprofile.user_driverprofile_userIdTouser
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: transformedLedger
    });

  } catch (error: any) {
    console.error('Error fetching ledger with relations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ledger with relations' },
      { status: 500 }
    );
  }
}