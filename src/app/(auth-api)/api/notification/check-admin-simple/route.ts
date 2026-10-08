// app/api/notification/check-admin-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check admin user with ID 1
    const adminId = 1;
    
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      include: {
        FcmTokens: true
      }
    });
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        hasToken: false,
        adminId: adminId,
        error: 'Admin user not found'
      });
    }
    
    const hasToken = admin.FcmTokens.length > 0;
    
    return NextResponse.json({
      success: true,
      hasToken: hasToken,
      adminId: adminId,
      adminName: admin.name,
      adminEmail: admin.email,
      tokenCount: admin.FcmTokens.length,
      tokens: admin.FcmTokens.map(t => ({
        id: t.id,
        tokenPreview: t.token.substring(0, 30) + '...',
        platform: t.platform,
        createdAt: t.createdAt
      }))
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      hasToken: false,
      error: error.message
    }, { status: 500 });
  }
}