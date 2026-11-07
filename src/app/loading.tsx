import React from "react";
import { Sparkles } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="relative flex flex-col items-center">
        {/* Glowing Orbs */}
        <div className="absolute w-44 h-44 rounded-full bg-sky-500/20 blur-3xl animate-pulse pointer-events-none" />
        
        {/* Animated 3D Ring */}
        <div className="relative w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-600 animate-spin shadow-[0_0_35px_rgba(56,189,248,0.5)]">
          <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-sky-400 animate-pulse" />
          </div>
        </div>

        <div className="mt-6 text-center space-y-1">
          <div className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-1">
            Academia<span className="text-sky-400">Sync</span>
          </div>
          <p className="text-xs font-mono text-slate-400">
            Initializing 3D Glassmorphism Workspace...
          </p>
        </div>
      </div>
    </div>
  );
}

