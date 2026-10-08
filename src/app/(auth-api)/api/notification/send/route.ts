// src/app/(auth-api)/api/notification/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging, isFirebaseAdminInitialized } from "../../../../../../lib/firebase/firebase-admin";
import type { MulticastMessage, Message, SendResponse } from "firebase-admin/messaging";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

interface NotificationMessage {
  title: string;
  body: string;
  imageUrl?: string;
}

interface SendNotificationRequest {
  tokens?: string[];
  userId?: number;
  driverId?: number;
  topic?: string;
  notification: NotificationMessage;
  data?: Record<string, string>;
}

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoNotifications(
  tokens: string[],
  notification: NotificationMessage,
  data?: Record<string, string>
): Promise<void> {
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({
    to,
    title: notification.title,
    body: notification.body,
    data: data || {},
    sound: "default",
    channelId: "default",
    ...(notification.imageUrl && { image: notification.imageUrl }),
  }));
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    console.log(`📱 Expo push sent to ${tokens.length} token(s):`, JSON.stringify(json).slice(0, 200));
  } catch (err) {
    console.error("Expo push error:", err);
  }
}

async function getUserDeviceTokens(userId: number): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      FcmTokens: true,
      driverprofile_driverprofile_userIdTouser: {
        include: { FcmTokens: true },
      },
    },
  });
  if (!user) return [];
  const tokens: string[] = [];
  if (user.FcmTokens?.length) tokens.push(...user.FcmTokens.map((t) => t.token));
  const dp = user.driverprofile_driverprofile_userIdTouser;
  if (dp?.FcmTokens?.length) tokens.push(...dp.FcmTokens.map((t) => t.token));
  return tokens;
}

async function getDriverDeviceTokens(driverId: number): Promise<string[]> {
  const driver = await prisma.driverprofile.findUnique({
    where: { id: driverId },
    include: { FcmTokens: true },
  });
  if (!driver?.FcmTokens?.length) return [];
  return driver.FcmTokens.map((t) => t.token);
}

export async function POST(req: NextRequest) {
  try {
    await getServerSession(authOptions);

    const body: SendNotificationRequest = await req.json();

    if (!body.notification?.title || !body.notification?.body) {
      return NextResponse.json(
        { error: "Notification title and body are required" },
        { status: 400 }
      );
    }

    let tokens: string[] = [];

    if (body.userId) {
      tokens = await getUserDeviceTokens(body.userId);
    } else if (body.driverId) {
      tokens = await getDriverDeviceTokens(body.driverId);
    } else if (body.tokens?.length) {
      tokens = body.tokens;
    } else if (body.topic) {
      const topicMessage: Message = {
        topic: body.topic,
        data: {
          ...body.data,
          title: body.notification.title,
          body: body.notification.body,
          ...(body.notification.imageUrl && { imageUrl: body.notification.imageUrl }),
        },
        webpush: { fcmOptions: { link: body.data?.url || "/" } },
      };
      const response = await getAdminMessaging().send(topicMessage);
      return NextResponse.json({ success: true, messageId: response, type: "topic" });
    } else {
      return NextResponse.json(
        { error: "Provide userId, driverId, tokens, or topic" },
        { status: 400 }
      );
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: "No device tokens found for the specified user/driver" },
        { status: 404 }
      );
    }

    console.log(`📤 Sending notification to ${tokens.length} token(s)`);

    // ── Split tokens by type ──────────────────────────────────────────────────
    const expoTokens = tokens.filter(isExpoToken);
    const fcmTokens  = tokens.filter((t) => !isExpoToken(t));

    console.log(`   Expo tokens: ${expoTokens.length}, FCM tokens: ${fcmTokens.length}`);

    // ── Send Expo tokens via Expo Push API (no Firebase needed) ──────────────
    if (expoTokens.length > 0) {
      await sendExpoNotifications(expoTokens, body.notification, body.data);
    }

    // ── If no FCM tokens, we're done ─────────────────────────────────────────
    if (fcmTokens.length === 0) {
      return NextResponse.json({
        success: true,
        successCount: expoTokens.length,
        failureCount: 0,
        invalidTokensRemoved: 0,
        sentTo: body.userId
          ? `user:${body.userId}`
          : body.driverId
          ? `driver:${body.driverId}`
          : "direct_tokens",
      });
    }

    // ── Send FCM tokens via Firebase Admin SDK ────────────────────────────────
    const multicastMessage: MulticastMessage = {
      tokens: fcmTokens,
      // notification field causes browser/SW to show the notification
      notification: {
        title: body.notification.title,
        body: body.notification.body,
        ...(body.notification.imageUrl && { imageUrl: body.notification.imageUrl }),
      },
      // data field for custom handling in SW / app
      data: {
        ...body.data,
        title: body.notification.title,
        body: body.notification.body,
        ...(body.notification.imageUrl && { imageUrl: body.notification.imageUrl }),
      },
      webpush: {
        notification: {
          title: body.notification.title,
          body: body.notification.body,
          icon: "/icons/icon-192x192.png",
          ...(body.notification.imageUrl && { image: body.notification.imageUrl }),
        },
        fcmOptions: { link: body.data?.url || "/" },
      },
    };

    const response = await getAdminMessaging().sendEachForMulticast(multicastMessage);
    console.log(`📬 FCM Response — Success: ${response.successCount}, Failure: ${response.failureCount}`);

    // ── Only delete tokens that are definitively invalid ──────────────────────
    const invalidTokens: string[] = [];

    if (response.successCount > 0 || response.failureCount < fcmTokens.length) {
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          const msg  = resp.error.message?.toLowerCase() ?? "";
          const isDefinitelyInvalid =
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered" ||
            msg.includes("registration token not registered") ||
            msg.includes("token is not registered") ||
            msg.includes("unregistered");

          if (isDefinitelyInvalid) {
            console.log(`🗑️  Token ${idx + 1} is invalid (${code}) — will remove`);
            invalidTokens.push(fcmTokens[idx]);
          } else {
            console.log(`⚠️  Token ${idx + 1} failed with ${code} — keeping (may be transient)`);
          }
        }
      });
    } else {
      console.warn("⚠️  ALL FCM tokens failed — likely a Firebase config issue. Skipping token deletion.");
      console.log("Firebase Project ID:",   process.env.FIREBASE_PROJECT_ID   ? "Set" : "Missing");
      console.log("Firebase Client Email:", process.env.FIREBASE_CLIENT_EMAIL  ? "Set" : "Missing");
      console.log("Firebase Private Key:",  process.env.FIREBASE_PRIVATE_KEY   ? `Set (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : "Missing");
    }

    if (invalidTokens.length > 0) {
      try {
        const del = await prisma.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
        console.log(`✅ Removed ${del.count} invalid FCM token(s) from DB`);
      } catch (deleteError) {
        console.error("Failed to delete tokens:", deleteError);
      }
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount + expoTokens.length,
      failureCount: response.failureCount,
      invalidTokensRemoved: invalidTokens.length,
      sentTo: body.userId
        ? `user:${body.userId}`
        : body.driverId
        ? `driver:${body.driverId}`
        : "direct_tokens",
    });
  } catch (err: any) {
    console.error("🔥 Error sending notification:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "Firebase Cloud Messaging",
    timestamp: new Date().toISOString(),
    firebase: {
      initialized: isFirebaseAdminInitialized(),
      projectId:   process.env.FIREBASE_PROJECT_ID   ? "✓ Set" : "✗ Missing",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL  ? "✓ Set" : "✗ Missing",
      privateKey:  process.env.FIREBASE_PRIVATE_KEY
        ? `✓ Set (${process.env.FIREBASE_PRIVATE_KEY.length} chars)`
        : "✗ Missing",
    },
  });
}
