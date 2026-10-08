// lib/notification/client-sender.ts
// Client-side helper to send notifications via your API

interface NotificationMessage {
  title: string;
  body: string;
  imageUrl?: string;
}

interface NotificationData {
  url?: string;
  type?: string;
  referenceId?: string;
  [key: string]: any;
}

export async function sendNotification(
  to: { userId?: number; driverId?: number; tokens?: string[] },
  notification: NotificationMessage,
  data?: NotificationData
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/notification/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...to,
        notification,
        data
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send notification'
      };
    }

    return {
      success: true,
      message: `Notification sent successfully (${result.successCount} devices)`
    };
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

// Convenience functions
export const sendToUser = (userId: number, notification: NotificationMessage, data?: NotificationData) =>
  sendNotification({ userId }, notification, data);

export const sendToDriver = (driverId: number, notification: NotificationMessage, data?: NotificationData) =>
  sendNotification({ driverId }, notification, data);

export const sendToTokens = (tokens: string[], notification: NotificationMessage, data?: NotificationData) =>
  sendNotification({ tokens }, notification, data);