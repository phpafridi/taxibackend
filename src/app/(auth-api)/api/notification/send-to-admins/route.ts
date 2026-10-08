// src/app/(auth-api)/api/notification/send-to-admins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging, isFirebaseAdminInitialized } from "../../../../../../lib/firebase/firebase-admin";
import type { MulticastMessage, SendResponse } from "firebase-admin/messaging";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config";

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({
    to, title, body,
    data: data || {},
    sound: "default",
    channelId: "default",
  }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    console.log(`📱 Expo push sent to ${tokens.length} admin token(s)`);
  } catch (err) {
    console.error("Expo push error:", err);
  }
}

export async function POST(req: NextRequest) {
  console.log("🔔 send-to-admins endpoint called");

  try {
    const authHeader = req.headers.get("authorization");
    const internalApiKey = process.env.NEXTAUTH_SECRET || "your-internal-secret";
    let isInternalCall = false;

    if (authHeader && authHeader === `Bearer ${internalApiKey}`) {
      console.log("✅ Internal API call authenticated");
      isInternalCall = true;
    }

    if (!isInternalCall) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        console.log("❌ No session found");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log("✅ User authenticated");
    }

    const body = await req.json();
    const { notification, data } = body;

    if (!notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: "Notification title and body are required" },
        { status: 400 }
      );
    }

    console.log("🔔 Getting all admin FCM tokens...");
    const adminTokens = await prisma.fcmToken.findMany({
      where: { user: { role: "ADMIN", isActive: true } },
      select: { token: true },
    });

    console.log(`🔔 Found ${adminTokens.length} admin token(s)`);

    if (adminTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No admin devices registered for notifications",
        sentCount: 0,
      });
    }

    const tokens = adminTokens.map((t) => t.token);

    // ── Split by token type ───────────────────────────────────────────────────
    const expoTokens = tokens.filter(isExpoToken);
    const fcmTokens = tokens.filter((t) => !isExpoToken(t));

    console.log(`   Expo tokens: ${expoTokens.length}, FCM tokens: ${fcmTokens.length}`);

    // ── Expo delivery ─────────────────────────────────────────────────────────
    if (expoTokens.length > 0) {
      await sendExpoNotifications(expoTokens, notification.title, notification.body, data);
    }

    // ── FCM delivery ──────────────────────────────────────────────────────────
    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;
    const invalidTokens: string[] = [];

    if (fcmTokens.length > 0) {
      const multicastMessage: MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...(data || {}),
          title: notification.title,
          body: notification.body,
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: "/icons/icon-192x192.png",
          },
          fcmOptions: { link: data?.url || "/" },
        },
      };

      const response = await getAdminMessaging().sendEachForMulticast(multicastMessage);
      fcmSuccessCount = response.successCount;
      fcmFailureCount = response.failureCount;
      console.log(`📬 FCM — Success: ${fcmSuccessCount}, Failure: ${fcmFailureCount}`);

      if (fcmSuccessCount > 0 || fcmFailureCount < fcmTokens.length) {
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            const msg = resp.error.message?.toLowerCase() ?? "";
            const isDefinitelyInvalid =
              code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered" ||
              msg.includes("registration token not registered") ||
              msg.includes("token is not registered") ||
              msg.includes("unregistered");

            if (isDefinitelyInvalid) {
              console.log(`🗑️  Admin token ${idx + 1} is invalid — will remove`);
              invalidTokens.push(fcmTokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await prisma.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
          console.log(`✅ Removed ${invalidTokens.length} invalid admin token(s)`);
        }
      } else {
        console.warn("⚠️  ALL FCM tokens failed — likely Firebase config issue. Skipping deletion.");
        response.responses.forEach((resp: SendResponse, idx: number) => {
          console.error(`❌ FCM Error [${idx}]: code=${resp.error?.code} message=${resp.error?.message}`);
          console.error(`❌ Token[${idx}]: ${fcmTokens[idx]?.substring(0, 40)}...`);
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: expoTokens.length + fcmSuccessCount,
      adminCount: adminTokens.length,
      tokenCount: tokens.length,
      invalidTokensRemoved: invalidTokens.length,
    });
  } catch (err: any) {
    console.error("❌ Error in send-to-admins:", err);
    return NextResponse.json(
      {
        error: err.message || "Unknown error",
        debug: {
          firebaseInitialized: isFirebaseAdminInitialized(),
          environment: {
            projectId: !!process.env.FIREBASE_PROJECT_ID,
            clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          },
        },
      },
      { status: 500 }
    );
  }
}
