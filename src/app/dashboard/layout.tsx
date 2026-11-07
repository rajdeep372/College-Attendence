"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, ArrowLeft, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { RoleSwitcher } from "@/components/dashboard/RoleSwitcher";
import { UserButton, useUser } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950/80">
      {/* Top Glass Dashboard Header */}
      <header className="sticky top-0 z-40 w-full border-b border-sky-500/20 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand & Home */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition-transform hover:scale-105"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-white/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block">
                <span className="text-base font-bold tracking-tight text-white">
                  Academia<span className="text-sky-400">Sync</span>
                </span>
                <span className="block text-[10px] text-sky-400/80 -mt-1 font-mono">
                  MANAGEMENT PORTAL
                </span>
              </div>
            </Link>

            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>
          </div>

          {/* Center: Role Switcher */}
          <div className="flex-1 flex justify-center max-w-xl">
            <RoleSwitcher />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <InstallPwaPrompt />
            <ThemeToggle />

            {/* Notification Icon */}
            <button
              className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-sky-500/20 text-slate-300 hover:text-sky-400 transition-all cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            </button>

            {/* Clerk User Button or Dev User Avatar */}
            {isSignedIn ? (
              <div className="p-0.5 rounded-full border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                  AS
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-semibold text-slate-200">Admin Demo</div>
                  <div className="text-[10px] text-sky-400">Role Verified</div>
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

