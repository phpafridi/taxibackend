// app/api/ledger/summary/route.ts
import { prisma } from "../../../../../../lib/prisma";
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    // Get all ledger entries with just the fields we need
    const ledgerEntries = await prisma.ledger.findMany({
      select: {
        direction: true,
        amount: true,
        category: true,
        ownerType: true,
        createdAt: true
      }
    });

    // Convert Decimal to numbers and calculate totals
    const ledgerNumbers = ledgerEntries.map(entry => ({
      ...entry,
      amount: Number(entry.amount)
    }));

    const totalCredit = ledgerNumbers
      .filter(l => l.direction === 'CREDIT')
      .reduce((sum, l) => sum + l.amount, 0);

    const totalDebit = ledgerNumbers
      .filter(l => l.direction === 'DEBIT')
      .reduce((sum, l) => sum + l.amount, 0);

    const netBalance = totalCredit - totalDebit;

    // Get counts by category
    const categorySummary = ledgerNumbers.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) {
        acc[category] = { credit: 0, debit: 0, count: 0 };
      }
      if (entry.direction === 'CREDIT') {
        acc[category].credit += entry.amount;
      } else {
        acc[category].debit += entry.amount;
      }
      acc[category].count++;
      return acc;
    }, {} as Record<string, { credit: number; debit: number; count: number }>);

    // Get recent entries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentEntries = ledgerNumbers
      .filter(l => new Date(l.createdAt) >= sevenDaysAgo)
      .length;

    return NextResponse.json({
      success: true,
      data: {
        totalCredit,
        totalDebit,
        netBalance,
        totalEntries: ledgerEntries.length,
        recentEntries,
        categorySummary: Object.entries(categorySummary).map(([category, stats]) => ({
          category,
          ...stats,
          net: stats.credit - stats.debit
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching ledger summary:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ledger summary' },
      { status: 500 }
    );
  }
}