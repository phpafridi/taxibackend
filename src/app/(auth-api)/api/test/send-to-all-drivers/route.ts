import { NextResponse } from "next/server";
import { getAdminMessaging } from "../../../../../../lib/firebase/firebase-admin";
import type { MulticastMessage } from "firebase-admin/messaging";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notification, data } = body;
    
    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: "Notification title and body are required" },
        { status: 400 }
      );
    }
    
    // Get all driver FCM tokens
    const driverTokens = await prisma.fcmToken.findMany({
      where: {
        driverId: {
          not: null
        }
      },
      select: {
        token: true
      }
    });
    
    if (driverTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No driver devices registered",
        sentCount: 0
      });
    }
    
    const tokens = driverTokens.map(t => t.token);
    
    const multicastMessage: MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.url || '/driver/dashboard',
        },
      },
    };
    
    const response = await getAdminMessaging().sendEachForMulticast(multicastMessage);
    
    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
      driverCount: driverTokens.length,
      tokenCount: tokens.length
    });
    
  } catch (err: any) {
    console.error('Error sending to all drivers:', err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}