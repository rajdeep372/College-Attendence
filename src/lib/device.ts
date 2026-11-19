/**
 * Device Fingerprinting & Anti-Proxy Token Management
 * Stores a persistent UUID in localStorage under `academiasync_device_id`.
 * Strictly enforces: 1 Device = 1 Attendance submission per classroom session.
 */

const DEVICE_ID_STORAGE_KEY = "academiasync_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId || deviceId.trim().length === 0) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = "dev-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (err) {
    console.warn("[device] Could not access localStorage for deviceId:", err);
    return "dev-fallback-" + Date.now();
  }
}
