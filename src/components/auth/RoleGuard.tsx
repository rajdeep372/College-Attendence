"use client";

import React from "react";
import Link from "next/link";
import { UserRole } from "@/models/User";
import { SerializedUser } from "@/lib/actions/user.actions";
import { ShieldAlert, ArrowRight, Lock, Sparkles } from "lucide-react";
import { getRoleDashboardPath } from "@/lib/auth-rbac";

interface RoleGuardProps {
  allowedRole: UserRole;
  user: SerializedUser | null;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, user, children }: RoleGuardProps) {
  // If no user is logged in
  if (!user) {
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Authentication Required:</strong> Please sign in with your official college credentials to view the <strong>{allowedRole}</strong> station.
            </span>
          </div>
          <Link
            href="/sign-in"
            className="text-sky-300 hover:text-white font-semibold underline shrink-0"
          >
            Sign In &rarr;
          </Link>
        </div>
        {children}
      </div>
    );
  }

  // If user has not completed onboarding
  if (user && user.onboarded === false) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl glass-card border-2 border-sky-500/40 text-center shadow-[0_20px_50px_rgba(56,189,248,0.25)] animate-fade-in relative overflow-hidden text-white">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4 shadow-lg">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Mandatory Onboarding Required
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          Please complete your initial registration with your Roll Number, Department, and Semester to map your classes and access your dashboard.
        </p>
        <div className="mt-6">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all"
          >
            <span>Complete Setup Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Check case-insensitive match for role ("Teacher" vs "teacher")
  const userRoleNormalized = (user.role || "").toLowerCase();
  const allowedRoleNormalized = (allowedRole || "").toLowerCase();

  const isAuthorized = userRoleNormalized === allowedRoleNormalized;

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl glass-card border-2 border-rose-500/40 text-center shadow-[0_20px_50px_rgba(244,63,94,0.25)] animate-fade-in relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-2">
          Strict Institutional RBAC Violation
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Unauthorized Role Sector
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          This academic station is strictly reserved for verified <strong>{allowedRole}</strong> credentials.
          Your authenticated institutional profile is registered as <strong className="text-sky-300 font-mono">{user.role}</strong>. Cross-role navigation is prohibited by institutional policy.
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-left max-w-sm mx-auto space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Identity:</span>
            <span className="font-semibold text-white truncate max-w-[180px]">{user.name}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Assigned Role:</span>
            <span className="font-bold text-sky-400 font-mono">{user.role}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
          <Link
            href={getRoleDashboardPath(user.role)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
          >
            <span>Return to My Authorized {user.role} Station</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
