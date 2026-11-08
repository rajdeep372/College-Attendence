"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Navigation,
  Compass,
  Crosshair
} from "lucide-react";

interface StudentTotpModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  onSuccess?: () => void;
  activeSubject?: string;
  activeTimeSlot?: string;
}

export function StudentTotpModal({
  isOpen,
  onClose,
  studentId,
  onSuccess,
  activeSubject,
  activeTimeSlot,
}: StudentTotpModalProps) {
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    subject?: string;
    distanceMeters: number;
    timestamp?: string;
  } | null>(null);

  const obtainCoordinates = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Browser Geolocation is not supported on this device."));
        return;
      }

      setIsLocating(true);
      setStatusMessage("Acquiring high-accuracy GPS fix from device sensors...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (geoError) => {
          setIsLocating(false);
          let msg = "Could not retrieve GPS coordinates.";
          if (geoError.code === geoError.PERMISSION_DENIED) {
            msg = "GPS location permission is blocked or denied. Please enable location permissions in your browser or device settings to verify physical presence on campus.";
          } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
            msg = "GPS signal is weak or unavailable. Move closer to an open area or check that your device's location services are enabled.";
          } else if (geoError.code === geoError.TIMEOUT) {
            msg = "GPS location acquisition timed out (15s). Satellite fix is weak. Please move to an area with clear sky reception and try again.";
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleVerifyAndMark = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);

    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) {
      setErrorMessage("Please enter the complete 4-digit PIN displayed on your teacher's classroom console.");
      return;
    }

    try {
      setIsSubmitting(true);
      const userCoords = await obtainCoordinates();

      setStatusMessage("Verifying PIN & Campus Geofence (<50m) with institutional server...");

      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: cleanPin,
          totp: cleanPin,
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          studentId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Attendance verification failed.");
      }

      setSuccessResult({
        message: data.message || "Attendance recorded successfully!",
        subject: data.subject,
        distanceMeters: data.distanceMeters ?? 0,
        timestamp: data.timestamp,
      });

      setStatusMessage(null);

      // Trigger analytics ledger refresh
      if (onSuccess) {
        onSuccess();
      }

      // Auto close after 2.5s
      setTimeout(() => {
        handleModalClose();
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying attendance";
      setErrorMessage(msg);
      setStatusMessage(null);
    } finally {
      setIsSubmitting(false);
      setIsLocating(false);
    }
  };

  const handleModalClose = () => {
    setPin("");
    setErrorMessage(null);
    setStatusMessage(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleModalClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-400/40 rounded-3xl p-6 sm:p-7 shadow-2xl dark:shadow-[0_0_60px_rgba(56,189,248,0.25)] text-slate-900 dark:text-white pointer-events-auto my-auto overflow-hidden"
          >
            {/* Glow Aura */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 border border-sky-400/30 text-sky-500 dark:text-sky-400 shadow-md">
                  <KeyRound className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 mb-0.5">
                    <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: "10s" }} />
                    <span>Live Geofenced PIN Station</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Mark Classroom Attendance
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:hover:bg-rose-900/40 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Class Context */}
            {activeSubject && (
              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">Active Session</span>
                  <span className="font-bold text-sky-700 dark:text-sky-300">{activeSubject}</span>
                </div>
                {activeTimeSlot && (
                  <span className="font-mono text-[11px] px-2 py-1 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    {activeTimeSlot}
                  </span>
                )}
              </div>
            )}

            {/* Geofence Perimeter Indicator */}
            <div className="mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span className="text-[11px]">Strict Campus Perimeter: &le; 50 Meters</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                GPS Enforced
              </span>
            </div>

            {/* Success State */}
            <AnimatePresence>
              {successResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/50 shadow-md text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Attendance Verified & Recorded!</h4>
                    <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">{successResult.message}</p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-1 block">
                      Proximity: {successResult.distanceMeters}m &bull; Updated Absent &rarr; Present
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-900 dark:text-rose-200">Verification Failed</div>
                  <div className="text-[11px] mt-0.5">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Status Pulse */}
            {statusMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-500/30 text-xs text-sky-800 dark:text-sky-300 flex items-center gap-2 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500 dark:text-sky-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerifyAndMark} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Enter 4-Digit Classroom PIN</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal font-mono">
                    Projected on teacher&apos;s console
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    inputMode="numeric"
                    autoFocus
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                    disabled={isSubmitting || isLocating || Boolean(successResult)}
                    className="w-full tracking-[0.75em] text-center text-3xl sm:text-4xl font-mono font-extrabold px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border-2 border-slate-300 dark:border-sky-500/40 focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-700 shadow-inner transition-all"
                  />
                  {pin.length === 4 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || isLocating || pin.trim().length !== 4 || Boolean(successResult)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-teal-500 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting || isLocating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Acquiring GPS & Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>Verify GPS & Check In</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <Crosshair className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>Strict device GPS distance calculation to campus coordinates</span>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
