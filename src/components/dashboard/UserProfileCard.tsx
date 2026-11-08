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
  const department = user?.department || "General Academic & Sciences";
  const profilePicture = user?.profilePicture;

  const roleColors: Record<string, { badge: string; glow: string }> = {
    Principal: {
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
      glow: "rgba(168, 85, 247, 0.35)",
    },
    "Principal (Admin)": {
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
      glow: "rgba(168, 85, 247, 0.35)",
    },
    HOD: {
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      glow: "rgba(59, 130, 246, 0.35)",
    },
    "Head of Dept (HOD)": {
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      glow: "rgba(59, 130, 246, 0.35)",
    },
    Teacher: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      glow: "rgba(16, 185, 129, 0.35)",
    },
    "Faculty / Teacher": {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      glow: "rgba(16, 185, 129, 0.35)",
    },
    Student: {
      badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
      glow: "rgba(14, 165, 233, 0.35)",
    },
  };

  const currentTheme = roleColors[role] || roleColors.Student;

  return (
    <div className="relative p-5 sm:p-6 rounded-3xl glass-card border border-slate-200/90 dark:border-sky-400/25 shadow-md dark:shadow-[0_10px_35px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Glow Halo */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ backgroundColor: currentTheme.glow }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* Left: Avatar + Details */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 shadow-md shrink-0">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={name}
                className="w-full h-full rounded-[14px] object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-[14px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-800 dark:text-white font-bold text-xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 text-white">
              <ShieldCheck className="w-3 h-3" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentTheme.badge}`}
              >
                {role}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>{email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{department}</span>
              </span>
              {user?.rollNumber && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-sky-700 dark:text-sky-300 font-bold">
                  {user.rollNumber}
                </span>
              )}
              {role === "Student" && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 font-bold text-amber-800 dark:text-amber-300">
                    {user?.section || "Section A"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold">
                    Sem {user?.semester || 1}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                    ({user?.academicYear || "1st Year"})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: MongoDB Sync Status Badge */}
        <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/80 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
            <span>MongoDB Synchronized</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 sm:mt-1 font-mono">
            DB Profile Active
          </span>
        </div>
      </div>
    </div>
  );
}

