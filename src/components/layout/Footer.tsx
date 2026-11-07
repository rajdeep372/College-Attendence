"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-sky-500/20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl py-12 relative z-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>AcademiaSync</span>
              <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Next-Gen College Management & Smart Attendance OS
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          <a href="#features" className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
            Features
          </a>
          <a href="#roles" className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
            Role Architecture
          </a>
          <a href="#pwa" className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
            PWA Installation
          </a>
          <Link href="/dashboard" className="hover:text-sky-600 dark:hover:text-sky-300 transition-colors">
            Dashboard Portal
          </Link>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          &copy; 2026 AcademiaSync PWA &bull; Anti-Proxy Enabled
        </div>
      </div>
    </footer>
  );
}
