import { setVapidDetails, sendNotification } from "web-push";

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  "BBkdDjLaJL1n50qu8am76-78Qcksg12CDjrUBIprU713xJkd3lNHT2WVXo7Nosznlt4bUtuu4sOxo57uKIC7fag";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "LkQbRlqXlRuGl8q9rKdJU7OmvSWA_hxyQ7uof0XwTDg";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@academiasync.edu";

// Initialize VAPID details once
try {
  setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn("[WebPush] Failed to initialize VAPID details:", err);
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendWebPush(
  subscription: StoredSubscription,
  payload: WebPushPayload
): Promise<{ success: boolean; statusCode?: number; expired?: boolean; error?: string }> {
  try {
    setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-192x192.png",
      tag: payload.tag || "academiasync-alert",
      data: {
        url: payload.url || "/dashboard",
        ...(payload.data || {}),
      },
    });

    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      pushPayload,
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: "high",
      }
    );

    return { success: true };
  } catch (error: any) {
    const statusCode = error?.statusCode;
    const isExpired = statusCode === 404 || statusCode === 410;

    return {
      success: false,
      statusCode,
      expired: isExpired,
      error: error instanceof Error ? error.message : "Unknown WebPush error",
    };
  }
}
