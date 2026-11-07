"use client";

import React from "react";
import Link from "next/link";
import { UserRole } from "@/models/User";
import { SerializedUser, updateUserRole } from "@/lib/actions/user.actions";
import { ShieldAlert, ArrowRight, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
  allowedRole: UserRole;
  user: SerializedUser | null;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, user, children }: RoleGuardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);

  // If no user is logged in (e.g., direct preview in dev mode without Clerk credentials),
  // allow developer preview with an informative notice
  if (!user) {
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sky-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              <strong>Developer Mode:</strong> Previewing <strong>{allowedRole}</strong> Dashboard. Connect Clerk credentials or sign in to bind live user profiles.
            </span>
          </div>
          <Link
            href="/sign-in"
            className="text-sky-300 hover:text-white font-semibold underline shrink-0"
          >
            Sign In with Clerk &rarr;
          </Link>
        </div>
        {children}
      </div>
    );
  }

  // Check case-insensitive match for role ("Principal" vs "principal")
  const userRoleNormalized = user.role.toLowerCase();
  const allowedRoleNormalized = allowedRole.toLowerCase();

  const isAuthorized = userRoleNormalized === allowedRoleNormalized;

  // Handle switching role for testing/dev
  const handleSwitchToThisRole = async () => {
    setIsUpdating(true);
    try {
      await updateUserRole(user.clerkId, allowedRole);
      router.refresh();
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl glass-card border border-rose-500/30 text-center shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-fade-in">
        <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4 shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Role Access Restriction
        </h2>

        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          This portal is strictly designated for <strong>{allowedRole}</strong> access.
          Your current authenticated profile in MongoDB is registered as <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">{user.role}</span>.
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Authenticated Name:</span>
            <span className="font-semibold text-white">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Assigned Institutional Role:</span>
            <span className="font-semibold text-sky-400">{user.role}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/dashboard/${user.role.toLowerCase()}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
          >
            <span>Go to My {user.role} Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Dev Role Switcher */}
          <button
            onClick={handleSwitchToThisRole}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
            <span>Change My Role to {allowedRole} (Demo Mode)</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

