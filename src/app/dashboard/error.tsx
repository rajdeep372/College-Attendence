"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Section Error]:", error);
  }, [error]);

  return (
    <div className="p-8 rounded-3xl glass-card border border-rose-500/30 shadow-[0_15px_45px_rgba(244,63,94,0.15)] text-center max-w-xl mx-auto my-12 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

      <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/30">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight">
        Dashboard Feed Interrupted
      </h3>

      <p className="mt-2 text-xs text-slate-300">
        {error.message || "Failed to load dashboard metrics or database documents."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reload Dashboard</span>
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Role Hub</span>
        </Link>
      </div>
    </div>
  );
}

