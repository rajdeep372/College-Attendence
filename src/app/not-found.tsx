import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-sky-400/30 text-center shadow-[0_20px_50px_rgba(2,132,199,0.18)] relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 border border-sky-500/40 text-sky-400 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: "20s" }} />
        </div>

        <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300">
          404
        </div>

        <h2 className="text-xl font-bold text-white mt-2">
          Sector Out of Bounds
        </h2>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          The lecture hall, dashboard route, or academic resource you are seeking does not exist or has been relocated.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Landing</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

