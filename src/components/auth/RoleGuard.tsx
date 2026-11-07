"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { UserRole } from "@/models/User";
import { SerializedUser } from "@/lib/actions/user.actions";
import { ShieldAlert, ArrowRight, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
  allowedRole: UserRole;
  user: SerializedUser | null;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, user, children }: RoleGuardProps) {
  const router = useRouter();

  // If user is not authenticated, redirect to Sign In
  useEffect(() => {
    if (!user) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 border border-sky-400/30">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Authentication Required</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm">
          Redirecting to secure login station...
        </p>
      </div>
    );
  }

  const userRoleNormalized = user.role.toLowerCase();
  const allowedRoleNormalized = allowedRole.toLowerCase();
  const isAuthorized = userRoleNormalized === allowedRoleNormalized;

  // Strict RBAC: Automatically redirect unauthorized user to their own verified dashboard
  useEffect(() => {
    if (!isAuthorized && user) {
      const targetPortal = `/dashboard/${user.role.toLowerCase()}`;
      router.replace(targetPortal);
    }
  }, [isAuthorized, user, router]);

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl glass-card border border-rose-500/30 text-center shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-fade-in">
        <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-4 shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Strict Access Restriction
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Access denied. This dashboard is restricted to <strong>{allowedRole}</strong> credentials only.
        </p>

        <div className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 max-w-sm mx-auto space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Your Identity:</span>
            <span className="font-semibold">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Assigned Role:</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">{user.role}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/dashboard/${user.role.toLowerCase()}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
          >
            <span>Proceed to My {user.role} Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
