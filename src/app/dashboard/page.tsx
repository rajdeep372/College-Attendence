"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ROLES, UserRole } from "@/types/roles";
import { Shield, Award, Users, BookOpen, ArrowRight, Sparkles } from "lucide-react";

function DashboardDispatcherContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const roleParam = searchParams.get("role") as UserRole | null;

  useEffect(() => {
    // 1. If explicit query parameter provided, redirect immediately
    if (roleParam && ROLES[roleParam]) {
      router.replace(ROLES[roleParam].route);
      return;
    }

    // 2. If Clerk user metadata has a role assigned, route to their role dashboard
    if (isLoaded && user) {
      const userRole = (user.publicMetadata as { role?: UserRole })?.role;
      if (userRole && ROLES[userRole]) {
        router.replace(ROLES[userRole].route);
        return;
      }
    }
  }, [roleParam, isLoaded, user, router]);

  const roleIcons = {
    principal: Shield,
    hod: Award,
    teacher: Users,
    student: BookOpen,
  };

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 backdrop-blur-md mb-3 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Automated Role-Based Routing Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Select Your Academic Portal
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
          Welcome to AcademiaSync. Choose your verified role below to enter your customized 3D Glassmorphic dashboard.
        </p>
      </div>

      {/* 4 Interactive 3D Role Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
          const role = ROLES[roleKey];
          const Icon = roleIcons[roleKey];

          return (
            <Link
              key={roleKey}
              href={role.route}
              className="group relative p-6 rounded-3xl glass-card glass-card-interactive glass-specular border border-sky-500/20 hover:border-sky-400/60 overflow-hidden cursor-pointer"
            >
              {/* Subtle background glow */}
              <div
                className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                style={{ backgroundColor: role.glowColor }}
              />

              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-tr ${role.color} text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-sky-200 border border-white/10 backdrop-blur-md">
                  {role.badge}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors flex items-center gap-2">
                {role.title}
              </h3>

              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[48px]">
                {role.description}
              </p>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                <span>Enter {roleKey.toUpperCase()} Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 p-4 rounded-2xl bg-slate-900/50 border border-white/10 text-center text-xs text-slate-400 max-w-xl mx-auto backdrop-blur-md">
        💡 <strong className="text-slate-200">How Clerk Role Redirect Works:</strong> In production, when a user logs in, Clerk metadata <code className="text-sky-300">user.publicMetadata.role</code> automatically resolves their designated portal. In development/testing, click any portal above to inspect the customized views.
      </div>
    </div>
  );
}

export default function DashboardDispatcher() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-sm text-sky-300">Resolving Role & Routing...</p>
          </div>
        </div>
      }
    >
      <DashboardDispatcherContent />
    </Suspense>
  );
}

