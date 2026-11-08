"use client";

import { useEffect, useRef } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client-utils";

export function PushNotificationManager() {
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasPrompted.current) return;
    hasPrompted.current = true;

    async function initPushSubscription() {
      // Check feature support
      if (
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        console.warn("[WebPush] Push notifications or service workers not supported in this browser.");
        return;
      }

      try {
        let permission = Notification.permission;

        // Strictly prompt the user if permission is 'default'
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          console.log("[WebPush] Notification permission not granted:", permission);
          return;
        }

        // Wait for service worker
        const registration = await navigator.serviceWorker.ready;

        // Fetch application VAPID public key
        const keyRes = await fetch("/api/push/vapid-public-key");
        const keyData = await keyRes.json();
        if (!keyData.success || !keyData.publicKey) {
          console.error("[WebPush] Failed to retrieve VAPID public key from server.");
          return;
        }

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any,
          });
        }

        if (subscription) {
          const subJson = subscription.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: subJson }),
          });
          console.log("[WebPush] Successfully registered native Push Notification subscription.");
        }
      } catch (err) {
        console.warn("[WebPush] Error setting up native push subscription:", err);
      }
    }

    // Delay by a brief interval so dashboard UI renders smoothly first
    const timer = setTimeout(() => {
      initPushSubscription();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return null;
}

