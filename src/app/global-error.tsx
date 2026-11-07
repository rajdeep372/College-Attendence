"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Critical System Error</h2>
          <p className="mt-2 text-xs text-slate-300">
            {error.message || "A critical error interrupted the core shell."}
          </p>
          <div className="mt-6">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application Shell</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

