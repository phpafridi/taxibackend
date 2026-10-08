import { NextRequest, NextResponse } from 'next/server';
import '../../../../../../lib/firebase/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth-config';
import { prisma } from '../../../../../../lib/prisma';


interface TokenRequestBody {
  token: string;
  userId: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    language: string;
    timestamp: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TokenRequestBody = await request.json();

    if (!body.token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    
    console.log("🔑 Token save request received:", {
      userId,
      tokenLength: body.token.length,
      userRoleFromSession: session.user.role,
      userEmail: session.user.email
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        FcmTokens: true,
        driverprofile_driverprofile_userIdTouser: {
          include: {
            FcmTokens: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log("👤 User found:", {
      userId: user.id,
      role: user.role,
      hasDriverProfile: !!user.driverprofile_driverprofile_userIdTouser,
      driverProfileId: user.driverprofile_driverprofile_userIdTouser?.id
    });

    // Get driver profile if exists
    const driverProfile = user.driverprofile_driverprofile_userIdTouser;

    // Upsert on the unique token field — avoids duplicate key errors
    const isDriver = user.role === 'DRIVER' && !!driverProfile;
    const upserted = await prisma.fcmToken.upsert({
      where: { token: body.token },
      update: {
        userId: isDriver ? null : userId,
        driverId: isDriver ? driverProfile!.id : null,
        platform: body.deviceInfo?.platform,
        updatedAt: new Date(),
      },
      create: {
        token: body.token,
        userId: isDriver ? null : userId,
        driverId: isDriver ? driverProfile!.id : null,
        platform: body.deviceInfo?.platform,
        updatedAt: new Date(),
      },
    });

    console.log("✅ Token upserted:", { tokenId: upserted.id, driverId: upserted.driverId, userId: upserted.userId });

    return NextResponse.json({
      success: true,
      message: 'Token saved successfully',
      token: body.token,
      tokenId: upserted.id,
      driverId: upserted.driverId,
      userId: upserted.userId,
      association: upserted.driverId ? 'driver' : 'user'
    });
  } catch (error: any) {
    console.error('❌ Error saving token:', error);
    return NextResponse.json({ 
      error: 'Failed to save token',
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const userId = Number(session.user.id);

    // Find user and driver profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driverprofile_driverprofile_userIdTouser: true  // Correct relation name
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const driverProfile = user.driverprofile_driverprofile_userIdTouser;

    // Delete token for user or driver
    await prisma.fcmToken.deleteMany({
      where: {
        token: token,
        OR: [
          { userId: userId },
          { driverId: driverProfile?.id }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Token removed successfully',
    });
  } catch (error: any) {
    console.error('Error deleting token:', error);
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
  }
}