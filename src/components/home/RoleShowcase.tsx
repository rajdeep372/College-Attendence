"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ROLES, UserRole } from "@/types/roles";
import { Shield, Award, Users, BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";

export function RoleShowcase() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("principal");

  const roleIcons = {
    principal: Shield,
    hod: Award,
    teacher: Users,
    student: BookOpen,
  };

  const roleHighlights: Record<UserRole, string[]> = {
    principal: [
      "College-wide attendance rate & department rankings",
      "Real-time faculty on-duty and compliance tracker",
      "One-click broadcast for circulars & notices",
      "Consolidated audit exports for accreditation (NAAC / NBA)",
    ],
    hod: [
      "Department-level timetable oversight & class tracking",
      "Student leave request approval and sanction workflow",
      "Teacher lecture workload & syllabus progression monitoring",
      "Branch-specific defaulter notifications",
    ],
    teacher: [
      "Dynamic rolling QR code generation with 15s refresh",
      "Geofence-constrained student check-in authorization",
      "Instant defaulter flag alerts (< 75% limit)",
      "Daily lecture timetable & lab attendance ledger",
    ],
    student: [
      "Live aggregate and subject-by-subject attendance percentages",
      "Bunk & Safe attendance margin calculator",
      "Digital student ID card with live geofence indicator",
      "Seamless leave application with medical attachment support",
    ],
  };

  const activeRole = ROLES[selectedRole];
  const ActiveIcon = roleIcons[selectedRole];

  return (
    <section id="roles" className="py-20 relative border-t border-sky-500/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Unified Campus Roles
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-black text-white tracking-tight">
            One Platform &bull; Four Dedicated Experiences
          </h2>
          <p className="mt-4 text-base text-slate-300">
            Every user receives a specialized, authenticated workspace tailored to their exact academic responsibilities.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl glass-card max-w-2xl mx-auto mb-10 border border-white/10">
          {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
            const role = ROLES[roleKey];
            const Icon = roleIcons[roleKey];
            const isSelected = selectedRole === roleKey;

            return (
              <button
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{roleKey.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Active Role Showcase Card */}
        <div className="max-w-4xl mx-auto p-8 sm:p-10 rounded-3xl glass-card border border-sky-400/30 shadow-[0_0_50px_rgba(56,189,248,0.15)] relative overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: activeRole.glowColor }}
          />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-tr ${activeRole.color} text-white shadow-lg`}>
                  <ActiveIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-white">{activeRole.title}</h3>
                  <span className="text-xs text-sky-400 font-semibold">{activeRole.badge}</span>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {activeRole.description}
              </p>

              <div className="space-y-2.5 pt-2">
                {roleHighlights[selectedRole].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  href={activeRole.route}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer"
                >
                  <span>Explore {activeRole.title} View</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Quick Preview Badge Graphic */}
            <div className="md:col-span-5 p-6 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col justify-center items-center text-center shadow-xl">
              <div className="w-20 h-20 rounded-full bg-sky-500/10 border-2 border-sky-400/40 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(56,189,248,0.25)]">
                <ActiveIcon className="w-10 h-10 text-sky-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">
                Route: <code className="text-sky-300 text-xs font-mono">{activeRole.route}</code>
              </h4>
              <p className="text-xs text-slate-400">
                Automatic redirect via Clerk authentication or direct testing access
              </p>
              <div className="mt-4 px-3 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Ready for Step 2 MongoDB Sync
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

