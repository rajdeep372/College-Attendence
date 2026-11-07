import React from "react";
import Link from "next/link";
import { WifiOff, RotateCcw, Home } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-sky-400/30 text-center shadow-[0_20px_50px_rgba(2,132,199,0.18)] relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(56,189,248,0.25)]">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20 mb-3">
          Offline Mode &bull; PWA Cache
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          Network Connection Lost
        </h2>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          AcademiaSync is operating from local device cache. Once your internet connectivity is restored, attendance submissions and database schedules will sync automatically.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Check Connectivity</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Role Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

