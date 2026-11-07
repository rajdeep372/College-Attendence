"use client";

import React from "react";
import Image from "next/image";
import { SerializedUser } from "@/lib/actions/user.actions";
import { UserRole } from "@/models/User";
import { ShieldCheck, Mail, Building, Phone, Sparkles, User as UserIcon } from "lucide-react";

interface UserProfileCardProps {
  user: SerializedUser | null;
  defaultRole: UserRole;
}

export function UserProfileCard({ user, defaultRole }: UserProfileCardProps) {
  const role = user?.role || defaultRole;
  const name = user?.name || `Academic ${defaultRole}`;
  const email = user?.email || "academic@college.edu";
  const department = user?.department || "Computer Science & Engineering";
  const profilePicture = user?.profilePicture;

  const roleColors: Record<UserRole, { badge: string; glow: string }> = {
    Principal: {
      badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      glow: "rgba(168, 85, 247, 0.35)",
    },
    HOD: {
      badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      glow: "rgba(59, 130, 246, 0.35)",
    },
    Teacher: {
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      glow: "rgba(16, 185, 129, 0.35)",
    },
    Student: {
      badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      glow: "rgba(14, 165, 233, 0.35)",
    },
  };

  const currentTheme = roleColors[role] || roleColors.Student;

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl glass-card border border-sky-400/25 shadow-[0_10px_35px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Glow Halo */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ backgroundColor: currentTheme.glow }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* Left: Avatar + Details */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(56,189,248,0.35)] shrink-0">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={name}
                className="w-full h-full rounded-[14px] object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-white font-bold text-xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 border-2 border-slate-950 text-white">
              <ShieldCheck className="w-3 h-3" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentTheme.badge}`}
              >
                {role}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>{email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                <span>{department}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: MongoDB Sync Status Badge */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>MongoDB Synchronized</span>
          </div>
          <span className="text-[10px] text-slate-400 sm:mt-1 font-mono">
            DB Profile Active
          </span>
        </div>
      </div>
    </div>
  );
}

