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

    // Only fetch count for badge polling — no findMany needed
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false, isForAdmin: true },
    });

    // Only fetch full list when notification panel is open (query param)
    const withDetails = request.nextUrl.searchParams.get('details') === 'true';
    // if (!withDetails) {
    //   return NextResponse.json({ notifications: [], unreadCount });
    // }

    const notifications = await prisma.notification.findMany({
      where: { userId, isRead: false, isForAdmin: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;
    const userId = Number(session.user.id);

    let whereClause: any = { userId, isForAdmin: true };
    if (!markAll && notificationIds?.length > 0) {
      whereClause.id = { in: notificationIds.map((id: any) => Number(id)) };
    }

    await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
