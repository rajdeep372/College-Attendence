"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, ArrowLeft, Bell, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { UserButton, useUser } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();

  // Determine current active dashboard portal name from URL path
  const currentPortal = pathname.includes("principal")
    ? "Principal Executive Console"
    : pathname.includes("hod")
    ? "HOD Department Terminal"
    : pathname.includes("teacher")
    ? "Faculty Attendance Station"
    : pathname.includes("student")
    ? "Student Academic Portal"
    : "Academic Management Workspace";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-slate-950/80 transition-colors duration-300">
      {/* Top Glass Dashboard Header (No Demo Toggles - Strict RBAC) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-sky-500/20 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Public link */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition-transform hover:scale-105"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-white/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Academia<span className="text-sky-500 dark:text-sky-400">Sync</span>
                </span>
                <span className="block text-[10px] text-sky-600 dark:text-sky-400/80 -mt-1 font-mono">
                  CAMPUS MANAGEMENT
                </span>
              </div>
            </Link>

            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-white bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>
          </div>

          {/* Center: Authoritative Portal Tag (Strictly Non-Switchable) */}
          <div className="flex-1 flex justify-center max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-400/30 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span className="truncate">{currentPortal}</span>
              <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-3">
            <InstallPwaPrompt />
            <ThemeToggle />

            {/* Notification Bell */}
            <button
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-sky-500/20 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer relative"
              aria-label="Campus Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            </button>

            {/* Clerk User Button */}
            {isSignedIn ? (
              <div className="p-0.5 rounded-full border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                  AS
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Academic Scholar
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400">Verified</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
