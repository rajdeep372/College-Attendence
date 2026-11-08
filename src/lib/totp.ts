import crypto from "crypto";

// Secret key for HMAC-based TOTP generation
const TOTP_SECRET = process.env.TOTP_SECRET || "ACADEMIA_SYNC_COLLEGE_SECRET_GEOFENCE_KEY";
const STEP_SECONDS = 60; // 60 seconds rolling window

// Fixed College Coordinate (Lecture Hall CS-301 / Campus Center)
export const COLLEGE_COORDINATES = {
  latitude: 22.5726,
  longitude: 88.3639,
  name: "Main Campus & Lecture Hall CS-301",
  allowedRadiusMeters: 50,
};

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Generates current 4-digit TOTP code and remaining seconds in window
 */
export function generateCurrentTotp(stepSeconds: number = STEP_SECONDS): {
  code: string;
  remainingSeconds: number;
  stepSeconds: number;
} {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(nowSeconds / stepSeconds);
  const remainingSeconds = stepSeconds - (nowSeconds % stepSeconds);

  const hash = crypto
    .createHmac("sha256", TOTP_SECRET)
    .update(counter.toString())
    .digest("hex");

  // Derive 4-digit PIN: 1000 - 9999
  const num = (parseInt(hash.slice(0, 8), 16) % 9000) + 1000;

  return {
    code: num.toString(),
    remainingSeconds,
    stepSeconds,
  };
}

/**
 * Generates random 4-digit PIN (1000 - 9999)
 */
export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Verifies a 4-digit TOTP PIN with drift tolerance (+/- 1 time window)
 * Strictly cryptographic - ZERO demo bypass codes
 */
export function verifyTotp(pin: string, stepSeconds: number = STEP_SECONDS): boolean {
  if (!pin) return false;
  const cleanPin = pin.trim();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(nowSeconds / stepSeconds);

  // Check current window, previous window, and next window
  for (const counter of [currentCounter, currentCounter - 1, currentCounter + 1]) {
    const hash = crypto
      .createHmac("sha256", TOTP_SECRET)
      .update(counter.toString())
      .digest("hex");
    const num = ((parseInt(hash.slice(0, 8), 16) % 9000) + 1000).toString();
    if (num === cleanPin) {
      return true;
    }
  }

  return false;
}
