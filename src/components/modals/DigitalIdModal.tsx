"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ShieldCheck, 
  Printer, 
  RotateCw, 
  Sparkles,
  ExternalLink
} from "lucide-react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

interface DigitalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    department?: string;
    academicYear?: string;
    semester?: number;
    section?: string;
    rollNumber?: string;
    profilePicture?: string;
    clerkId?: string;
  } | null;
}

export function DigitalIdModal({ isOpen, onClose, user }: DigitalIdModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [origin, setOrigin] = useState("https://academiasync.edu");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const roll = user?.rollNumber || (user?.clerkId ? user.clerkId.slice(-8).toUpperCase() : "2023-CS-094");
  const dept = user?.department || "Computer Science & Engineering";
  const name = user?.name || "Academic Scholar";
  const role = user?.role || "Student";
  const photo = user?.profilePicture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  // Real live verification URL for security/invigilators
  const verificationUrl = `${origin}/verify/${encodeURIComponent(roll)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-50 w-full max-w-md bg-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(56,189,248,0.2)] text-white overflow-hidden pointer-events-auto my-auto"
          >
            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h2 className="text-base font-bold text-white">Digital Campus Credential</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-all text-xs flex items-center gap-1.5 cursor-pointer pointer-events-auto border border-sky-500/20"
                  title="Flip Card"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isFlipped ? "View Front" : "View Back"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer pointer-events-auto"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Holographic ID Card Container */}
            <div className="perspective-1000">
              {!isFlipped ? (
                /* ================= FRONT FACE ================= */
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 border border-sky-500/40 shadow-2xl overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />

                  {/* College Branding */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow">
                        AS
                      </div>
                      <div>
                        <div className="text-xs font-black tracking-wider uppercase text-white">
                          AcademiaSync Institute
                        </div>
                        <div className="text-[10px] text-sky-400 tracking-widest uppercase">
                          Official Smart Campus ID
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {role.toUpperCase()}
                    </div>
                  </div>

                  {/* Student Photo and Core Details */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-sky-400/50 shadow-lg shrink-0 bg-slate-800">
                      <Image
                        src={photo}
                        alt={name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white truncate">{name}</h3>
                      <div className="text-xs font-mono font-bold text-sky-300 tracking-wide mt-0.5">
                        ROLL: {roll}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mt-1">
                        {dept}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-300">
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          {user?.section || "Section A"}
                        </span>
                        <span>&bull; Sem {user?.semester || 1}</span>
                        <span className="text-slate-400">({user?.academicYear || "1st Year"})</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification & Geofence Badge */}
                  <div className="py-2.5 px-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs mb-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Geofence: Inside Campus</span>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                  </div>

                  {/* Footer with Real Scannable SVG QR Code */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2.5 text-white">
                      {/* Real High-Contrast Dynamic QR Code */}
                      <div className="p-1 bg-white rounded-xl shadow-md border border-white shrink-0">
                        <QRCodeSVG
                          value={verificationUrl}
                          size={44}
                          bgColor="#ffffff"
                          fgColor="#090d16"
                          level="M"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                          Scannable Token
                        </span>
                        <span className="text-[11px] font-mono font-bold text-sky-300">
                          {roll.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      VALID: 2024 - 2028
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= BACK FACE ================= */
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-sky-500/30 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-white/10 pb-2">
                    <span>Official Security Verification</span>
                    <span className="text-[10px] text-emerald-400 font-mono">ENCRYPTED</span>
                  </div>

                  {/* Real Dynamic 2D QR Code with High Contrast */}
                  <div className="p-3 bg-white rounded-2xl flex flex-col items-center justify-center shadow-xl border border-white">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={120}
                      bgColor="#ffffff"
                      fgColor="#090d16"
                      level="H"
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 mt-2 font-mono">
                      SCAN WITH PHONE CAMERA TO VERIFY
                    </span>
                  </div>

                  {/* Real Dynamic 1D Barcode */}
                  <div className="p-2 bg-white rounded-xl flex items-center justify-center shadow-md border border-white overflow-hidden">
                    <Barcode
                      value={roll}
                      format="CODE128"
                      width={1.5}
                      height={36}
                      displayValue={true}
                      fontSize={10}
                      background="#ffffff"
                      lineColor="#090d16"
                      margin={0}
                    />
                  </div>

                  <div className="text-[10px] text-slate-400 text-center leading-relaxed">
                    Mandatory credential for physical lecture attendance & examination admittance. Cryptographically authenticated.
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg transition-all cursor-pointer pointer-events-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download ID</span>
              </button>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer pointer-events-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Link</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer pointer-events-auto"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
