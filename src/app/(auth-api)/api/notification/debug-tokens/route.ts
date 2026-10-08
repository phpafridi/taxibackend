// app/api/notification/debug-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';
import { prisma } from '../../../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    // Get user with driver profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driverprofile_driverprofile_userIdTouser: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const driverProfile = user.driverprofile_driverprofile_userIdTouser;

    // Get all tokens for this user (both user and driver tokens)
    const tokens = await prisma.fcmToken.findMany({
      where: {
        OR: [
          { userId: userId },
          { driverId: driverProfile?.id }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      },
      driverProfile: driverProfile ? {
        id: driverProfile.id,
        userId: driverProfile.userId
      } : null,
      tokens: tokens
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error.message 
    }, { status: 500 });
  }
}