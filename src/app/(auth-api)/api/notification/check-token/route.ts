// app/api/notification/check-token/route.ts
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
    const targetUserId = searchParams.get('userId') || userId.toString();

    console.log('Checking token status for user:', {
      userId,
      targetUserId,
      userRole: session.user.role,
      userEmail: session.user.email
    });

    // Get user with driver profile
    const user = await prisma.user.findUnique({
      where: { id: Number(targetUserId) },
      include: {
        driverprofile_driverprofile_userIdTouser: true,
        FcmTokens: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const driverProfile = user.driverprofile_driverprofile_userIdTouser;

    // Check for tokens in database for this user/driver
    const tokens = await prisma.fcmToken.findMany({
      where: {
        OR: [
          { userId: user.id },
          { driverId: driverProfile?.id }
        ]
      }
    });

    const hasToken = tokens.length > 0;
    
    console.log('Token check result:', {
      userId: user.id,
      role: user.role,
      hasDriverProfile: !!driverProfile,
      driverId: driverProfile?.id,
      tokenCount: tokens.length,
      hasToken
    });

    return NextResponse.json({
      success: true,
      hasToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      driverProfile: driverProfile ? {
        id: driverProfile.id,
        userId: driverProfile.userId
      } : null,
      tokenCount: tokens.length,
      tokens: tokens.map(t => ({
        id: t.id,
        userId: t.userId,
        driverId: t.driverId,
        createdAt: t.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error checking token status:', error);
    return NextResponse.json({ 
      error: 'Failed to check token status',
      details: error.message 
    }, { status: 500 });
  }
}