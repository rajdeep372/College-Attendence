"use client";

import React, { useState, useEffect } from "react";
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
  Lock,
  Unlock
} from "lucide-react";
import { calculateHaversineDistance, COLLEGE_COORDINATES } from "@/lib/totp";

interface StudentTotpModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  onSuccess?: () => void;
  activeSubject?: string;
  activeTimeSlot?: string;
}

// Master Central Campus Reference: RCCIIT Beliaghata
const RCCIIT_BELIAGHATA = {
  latitude: 22.5626,
  longitude: 88.3980,
  name: "RCCIIT Beliaghata Campus",
  address: "Canal South Road, Beliaghata, Kolkata, West Bengal 700015, India",
  allowedRadiusMeters: 150,
};

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
  const [isLocating, setIsLocating] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInsideCampus, setIsInsideCampus] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    subject?: string;
    distanceMeters: number;
    timestamp?: string;
  } | null>(null);

  // Real-time GPS Location & Distance Calculation
  const checkCampusGeofence = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setIsLocating(false);
      setIsInsideCampus(false);
      setGeofenceError("Browser Geolocation is not supported on this device.");
      return;
    }

    setIsLocating(true);
    setGeofenceError(null);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setCoords({ latitude: userLat, longitude: userLng });

        const dist = calculateHaversineDistance(
          userLat,
          userLng,
          RCCIIT_BELIAGHATA.latitude,
          RCCIIT_BELIAGHATA.longitude
        );
        setDistance(dist);

        // Validation Logic & PIN Unlocking:
        // If distance <= 150 meters, instantly unlock the 4-digit PIN input and show 'Inside Campus' badge
        // If distance > 150 meters, lock the PIN input and display exact error
        if (dist <= RCCIIT_BELIAGHATA.allowedRadiusMeters) {
          setIsInsideCampus(true);
          setGeofenceError(null);
        } else {
          setIsInsideCampus(false);
          setGeofenceError(
            `Geofence Violation: You are ${dist} meters away. You must be inside the RCCIIT campus perimeter to enter the PIN.`
          );
        }
      },
      (geoError) => {
        setIsLocating(false);
        setIsInsideCampus(false);
        let msg = "Could not retrieve GPS coordinates.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = "Location permission denied. You must grant device GPS location access to enter the PIN within RCCIIT Beliaghata campus.";
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = "GPS acquisition timed out. Please ensure Location is enabled with high accuracy.";
        }
        setGeofenceError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setErrorMessage(null);
      setSuccessResult(null);
      checkCampusGeofence();
    }
  }, [isOpen]);

  const handleVerifyAndMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInsideCampus) return;

    setErrorMessage(null);
    setSuccessResult(null);

    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) {
      setErrorMessage("Please enter the complete 4-digit PIN.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: cleanPin,
          totp: cleanPin,
          latitude: coords?.latitude ?? RCCIIT_BELIAGHATA.latitude,
          longitude: coords?.longitude ?? RCCIIT_BELIAGHATA.longitude,
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
        distanceMeters: data.distanceMeters ?? distance ?? 0,
        timestamp: data.timestamp,
      });

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setPin("");
    setErrorMessage(null);
    setGeofenceError(null);
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
            className="relative z-50 w-full max-w-lg bg-slate-900 border border-sky-400/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(56,189,248,0.25)] text-white pointer-events-auto my-auto overflow-hidden"
          >
            {/* Glow Aura */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 border border-sky-400/30 text-sky-400 shadow-md">
                  <KeyRound className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-0.5">
                    <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: "10s" }} />
                    <span>RCCIIT Campus-Wide Geofence</span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    PIN Attendance Station
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* RCCIIT Beliaghata Central Coordinates & Status Banner */}
            <div className="mb-4 p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-white block truncate">
                    RCCIIT Beliaghata Campus
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    22.5626° N, 88.3980° E &bull; 150m Perimeter
                  </span>
                </div>
              </div>

              {/* Status Badge: Inside Campus (Green) or Locating / Locked */}
              <div className="shrink-0 flex items-center gap-2">
                {isLocating ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                    <span>Scanning GPS...</span>
                  </div>
                ) : isInsideCampus ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Inside Campus</span>
                    {distance !== null && <span className="font-mono text-[11px] opacity-80">({distance}m)</span>}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>PIN Locked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Class Context */}
            {activeSubject && (
              <div className="mb-4 p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Active Session</span>
                  <span className="font-bold text-sky-300">{activeSubject}</span>
                </div>
                {activeTimeSlot && (
                  <span className="font-mono text-[11px] px-2 py-1 rounded bg-sky-950 text-sky-400 border border-sky-800">
                    {activeTimeSlot}
                  </span>
                )}
              </div>
            )}

            {/* Exact Geofence Violation Error Banner */}
            {geofenceError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 text-xs text-rose-200 flex items-start gap-3 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-100 uppercase tracking-wide text-[11px]">
                    Geofence Perimeter Locked
                  </div>
                  <p className="text-xs mt-1 leading-relaxed font-semibold">
                    {geofenceError}
                  </p>
                  <button
                    type="button"
                    onClick={checkCampusGeofence}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-scan Campus GPS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Other Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 font-semibold">{errorMessage}</div>
              </div>
            )}

            {/* Success State */}
            <AnimatePresence>
              {successResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-emerald-200 text-xs flex items-center gap-3"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Attendance Verified & Recorded!</h4>
                    <p className="mt-0.5 text-emerald-300">{successResult.message}</p>
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                      Proximity: {successResult.distanceMeters}m from RCCIIT &bull; Present Logged
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PIN Form */}
            <form onSubmit={handleVerifyAndMark} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {isInsideCampus ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">4-Digit PIN (Unlocked)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-rose-300">PIN Input Locked</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">
                    Projected on teacher&apos;s console
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    inputMode="numeric"
                    autoFocus={isInsideCampus}
                    placeholder={
                      isLocating
                        ? "ACQUIRING GPS..."
                        : !isInsideCampus
                        ? "LOCKED (OUTSIDE RCCIIT)"
                        : "••••"
                    }
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                    disabled={!isInsideCampus || isSubmitting || Boolean(successResult)}
                    className={`w-full tracking-[0.75em] text-center text-3xl sm:text-4xl font-mono font-extrabold px-6 py-4 rounded-2xl border-2 transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${
                      isInsideCampus
                        ? "bg-slate-950/90 border-emerald-500/50 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-white placeholder-slate-700"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 placeholder-slate-600 opacity-60 cursor-not-allowed"
                    }`}
                  />
                  {pin.length === 4 && isInsideCampus && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isInsideCampus || pin.trim().length !== 4 || isSubmitting || Boolean(successResult)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying PIN with Server...</span>
                    </>
                  ) : isInsideCampus ? (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>Submit PIN & Mark Present</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-rose-300" />
                      <span>{isLocating ? "Acquiring GPS Position..." : "LOCKED (Must be Inside RCCIIT)"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-sm">
                  {RCCIIT_BELIAGHATA.address}
                </span>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
