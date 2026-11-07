"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AcademiaSync Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-rose-500/30 shadow-[0_15px_45px_rgba(244,63,94,0.15)] text-center relative overflow-hidden">
        {/* Glow Halo */}
        <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          Application Exception
        </h2>
        
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {error.message || "An unexpected error occurred while processing the request. Your state has been preserved."}
        </p>

        {error.digest && (
          <div className="mt-3 py-1 px-3 rounded-lg bg-slate-900/80 border border-white/5 text-[10px] font-mono text-slate-400">
            Digest ID: {error.digest}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

