"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserRole, ROLES } from "@/types/roles";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileCheck,
  AlertTriangle,
  QrCode,
  CheckSquare,
  Award,
  BookOpen,
  Send,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Clock,
  MapPin,
  RefreshCw
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const ROLE_NAV_ITEMS: Record<UserRole, NavItem[]> = {
  principal: [
    { title: "Institutional Pulse", href: "/dashboard/principal", icon: LayoutDashboard },
    { title: "Department Audits", href: "/dashboard/principal#departments", icon: Building2 },
    { title: "Faculty Compliance", href: "/dashboard/principal#faculty", icon: Users },
    { title: "Accreditation Reports", href: "/dashboard/principal#reports", icon: BarChart3 },
    { title: "Campus Circulars", href: "/dashboard/principal#circulars", icon: Send },
  ],
  hod: [
    { title: "Department Health", href: "/dashboard/hod", icon: LayoutDashboard },
    { title: "Leave Approvals", href: "/dashboard/hod#leaves", icon: FileCheck, badge: "7 Pending" },
    { title: "Faculty Load", href: "/dashboard/hod#faculty", icon: Users },
    { title: "Class Schedules", href: "/dashboard/hod#schedule", icon: Calendar },
    { title: "Syllabus Tracking", href: "/dashboard/hod#syllabus", icon: BookOpen },
  ],
  teacher: [
    { title: "Classroom Console", href: "/dashboard/teacher", icon: LayoutDashboard },
    { title: "Dynamic QR Mark", href: "/dashboard/teacher#qr", icon: QrCode, badge: "Live" },
    { title: "Today's Schedule", href: "/dashboard/teacher#schedule", icon: Clock },
    { title: "Defaulter Flags", href: "/dashboard/teacher#defaulters", icon: AlertTriangle, badge: "<75%" },
    { title: "Attendance Records", href: "/dashboard/teacher#history", icon: CheckSquare },
  ],
  student: [
    { title: "Attendance Ledger", href: "/dashboard/student", icon: LayoutDashboard },
    { title: "Digital Campus ID", href: "/dashboard/student#id-card", icon: Award },
    { title: "Bunk & Safe Margin", href: "/dashboard/student#calculator", icon: BarChart3 },
    { title: "Subject Breakdown", href: "/dashboard/student#subjects", icon: BookOpen },
    { title: "Apply for Leave", href: "/dashboard/student#leave", icon: FileCheck },
  ],
};

interface DashboardSidebarProps {
  role: UserRole;
  customItems?: NavItem[];
}

export function DashboardSidebar({ role, customItems }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isSignedIn, user } = useUser();

  const currentRole = ROLES[role] || ROLES.principal;
  const navItems = customItems || ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.principal;

  const roleGradients: Record<UserRole, string> = {
    principal: "from-purple-500 to-indigo-600",
    hod: "from-blue-600 to-cyan-500",
    teacher: "from-emerald-500 to-teal-600",
    student: "from-sky-500 to-blue-600",
  };

  return (
    <>
      {/* Mobile Sidebar Toggle Floating Button */}
      <div className="lg:hidden fixed bottom-5 left-5 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-[0_0_25px_rgba(56,189,248,0.5)] border border-white/20 backdrop-blur-md cursor-pointer flex items-center gap-2"
          aria-label="Toggle navigation"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-xs font-bold uppercase tracking-wider">{role} Nav</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out flex flex-col justify-between
          ${isCollapsed ? "lg:w-20" : "lg:w-72"}
          w-72 max-w-[85vw]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl border-r border-slate-200 dark:border-sky-500/20 shadow-xl dark:shadow-[10px_0_35px_rgba(0,0,0,0.5)]
        `}
      >
        {/* Top Header / Brand Logo */}
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 overflow-hidden group"
            >
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${roleGradients[role]} flex items-center justify-center text-white shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20 group-hover:scale-105 transition-transform`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="animate-fade-in overflow-hidden whitespace-nowrap">
                  <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                    Academia<span className="text-sky-500 dark:text-sky-400">Sync</span>
                  </div>
                  <div className="text-[10px] font-mono tracking-widest text-sky-600 dark:text-sky-400/80 -mt-0.5">
                    {role.toUpperCase()} PORTAL
                  </div>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Role Status Tag */}
          {!isCollapsed && (
            <div className="px-4 py-3 mx-3 mt-3 rounded-2xl bg-sky-50 dark:bg-gradient-to-r dark:from-sky-950/60 dark:to-slate-900/60 border border-sky-400/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentRole.badge}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-400/30">
                Verified
              </span>
            </div>
          )}

          {/* Navigation Links (Role Strict) */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                  }`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-500 dark:text-sky-400 group-hover:text-sky-600 dark:group-hover:text-sky-300"}`} />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.title}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-sky-500/30 z-50">
                      {item.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Panel: Live Geofence Sensor, User & Utilities */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/10 space-y-3">
          {/* Mini Geofence Status */}
          {!isCollapsed && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-sky-500/20 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-300 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" /> Campus Radius
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">&le; 50m</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Anti-Proxy Geofence Active
              </p>
            </div>
          )}

          {/* User profile & actions */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2 overflow-hidden">
              {isSignedIn ? (
                <UserButton />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {role[0].toUpperCase()}
                </div>
              )}

              {!isCollapsed && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user?.fullName || `${currentRole.title}`}
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 truncate font-mono">
                    {role.toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
