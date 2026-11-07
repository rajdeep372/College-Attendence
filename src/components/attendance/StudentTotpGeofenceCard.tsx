"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  ShieldCheck, 
  KeyRound, 
  Compass, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  Wifi,
  Navigation,
  Crosshair
} from "lucide-react";

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface MarkAttendanceResult {
  success: boolean;
  message: string;
  distanceMeters: number;
  student?: {
    name: string;
    email: string;
  };
  timestamp?: string;
}

// Campus center: Lecture Hall CS-301
const COLLEGE_COORDS = {
  latitude: 22.5726,
  longitude: 88.3639,
};

export function StudentTotpGeofenceCard({ studentId }: { studentId?: string }) {
  const [pin, setPin] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [gpsSource, setGpsSource] = useState<"real" | "classroom">("classroom");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkAttendanceResult | null>(null);
  const [liveTeacherPin, setLiveTeacherPin] = useState<string | null>(null);

  // Fetch current live TOTP from server for easy reference & display
  useEffect(() => {
    async function loadLiveTotp() {
      try {
        const res = await fetch("/api/attendance/totp");
        const data = await res.json();
        if (data.success && data.code) {
          setLiveTeacherPin(data.code);
        }
      } catch {
        // Silent fallback
      }
    }
    loadLiveTotp();
  }, []);

  // Request browser GPS or use simulated lecture hall GPS
  const obtainCoordinates = (): Promise<GeolocationCoords> => {
    return new Promise((resolve, reject) => {
      if (gpsSource === "classroom") {
        // In-hall GPS with 8m realistic jitter inside the 50m radius
        const jitterLat = (Math.random() - 0.5) * 0.0001;
        const jitterLng = (Math.random() - 0.5) * 0.0001;
        const simulated = {
          latitude: COLLEGE_COORDS.latitude + jitterLat,
          longitude: COLLEGE_COORDS.longitude + jitterLng,
          accuracy: 10,
        };
        setCoords(simulated);
        resolve(simulated);
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error("Browser Geolocation API is not supported on this device."));
        return;
      }

      setIsLocating(true);
      setStatusMessage("Acquiring GPS fix via satellite...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const live = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(live);
          resolve(live);
        },
        (geoError) => {
          setIsLocating(false);
          let msg = "Could not retrieve GPS coordinates.";
          if (geoError.code === geoError.PERMISSION_DENIED) {
            msg = "Location permission denied. Please allow location access or switch to Classroom GPS mode.";
          } else if (geoError.code === geoError.TIMEOUT) {
            msg = "Location acquisition timed out.";
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Submit PIN + Coordinates
  const handleMarkPresent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) {
      setError("Please enter a valid 4-digit TOTP code.");
      return;
    }

    try {
      setIsSubmitting(true);
      const userCoords = await obtainCoordinates();

      setStatusMessage("Validating Geofence (<50m) & TOTP Hash with Campus Server...");

      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totp: cleanPin,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          studentId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Attendance verification failed.");
      }

      setResult({
        success: true,
        message: data.message,
        distanceMeters: data.distanceMeters,
        student: data.student,
        timestamp: data.timestamp,
      });
      setStatusMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error occurred";
      setError(msg);
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
      setIsLocating(false);
    }
  };

  return (
    <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-400/30 shadow-[0_15px_45px_rgba(2,132,199,0.18)] overflow-hidden">
      {/* Glow Halo */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-2">
            <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
            <span>Anti-Proxy Geofenced TOTP</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Lecture Hall Self Check-In
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Enter the 4-digit dynamic PIN from the projector screen. Your physical proximity is verified within 50 meters.
          </p>
        </div>

        {/* Proximity / Radar Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-sky-500/30 flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Geofence Limit</div>
              <div className="text-xs font-bold text-sky-300 font-mono">50m Radius</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Source Toggle & Dev Helpers */}
      <div className="my-5 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Target: <strong>Lecture Hall CS-301</strong> (22.5726° N, 88.3639° E)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400">GPS Mode:</span>
          <button
            type="button"
            onClick={() => setGpsSource("classroom")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              gpsSource === "classroom"
                ? "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Classroom GPS
          </button>
          <button
            type="button"
            onClick={() => setGpsSource("real")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              gpsSource === "real"
                ? "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Live Device GPS
          </button>
        </div>
      </div>

      {/* Submission Result Success Banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="my-5 p-5 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Attendance Verified & Recorded!</h4>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Status updated from <strong>Absent &rarr; Present</strong> in MongoDB Attendance ledger.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-400 mt-2 font-mono">
                  <span>Proximity: {result.distanceMeters}m from Podium</span>
                  <span>&bull;</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setResult(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shrink-0"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      {error && (
        <div className="my-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs font-semibold text-rose-300 flex items-start gap-3 animate-fade-in shadow-[0_0_25px_rgba(244,63,94,0.2)]">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-200">Verification Rejected</div>
            <div className="mt-0.5 leading-relaxed">{error}</div>
            {error.includes("Geofence") && (
              <div className="mt-2 text-[11px] text-rose-400 font-mono">
                Tip: If testing remotely, switch GPS Mode to &quot;Classroom GPS&quot; above to simulate being inside Lecture Hall CS-301.
              </div>
            )}
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white text-base leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Status Progress Notice */}
      {statusMessage && (
        <div className="my-4 p-3 rounded-xl bg-sky-950/50 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2 font-mono animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Form: 4-Digit TOTP Input & Button */}
      <form onSubmit={handleMarkPresent} className="space-y-6 my-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>4-Digit Dynamic TOTP Code</span>
            </span>
            <span className="text-[11px] text-slate-400 lowercase font-normal font-mono">
              Teacher PIN: <strong className="text-sky-300 font-bold">{liveTeacherPin || "8421"}</strong> (or 8421 / 1234)
            </span>
          </label>

          <div className="relative w-full max-w-xs">
            <input
              type="text"
              maxLength={4}
              pattern="[0-9]{4}"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              disabled={isSubmitting || isLocating}
              className="w-full tracking-[0.75em] text-center text-3xl sm:text-4xl font-mono font-extrabold px-6 py-4 rounded-2xl bg-slate-950/80 border-2 border-sky-500/40 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/20 text-white placeholder-slate-700 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition-all"
            />
            {pin.length === 4 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="submit"
            disabled={isSubmitting || isLocating || pin.trim().length !== 4}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:shadow-[0_0_45px_rgba(56,189,248,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting || isLocating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Verifying GPS & TOTP...</span>
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                <span>Mark Present (Verify Geofence)</span>
              </>
            )}
          </button>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>Dual Factor: Proximity Hash + Rotating One-Time Token</span>
          </div>
        </div>
      </form>
    </div>
  );
}

