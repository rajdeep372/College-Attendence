"use client";

import React from "react";
import { Smartphone, Download, Check, Sparkles, Globe, WifiOff } from "lucide-react";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";

export function PwaBannerSection() {
  return (
    <section id="pwa" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative p-8 sm:p-12 rounded-3xl glass-card border border-sky-400/40 bg-gradient-to-r from-slate-900/90 via-sky-950/40 to-slate-900/90 overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.2)]">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero App Store Dependency</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Install Directly from Your Browser Link
              </h2>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                No need to wait for Play Store downloads or store reviews. Students and faculty can add AcademiaSync directly to their home screen or desktop with full standalone PWA capabilities.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Instant 1-Click Installation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Offline Stale-While-Revalidate</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Native App Fullscreen Window</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4 text-center p-6 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Experience as Native App</div>
                <p className="text-xs text-slate-400 mt-1">
                  Works seamlessly across Android, iOS, Windows & Mac
                </p>
              </div>
              <div className="pt-2">
                <InstallPwaPrompt />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

