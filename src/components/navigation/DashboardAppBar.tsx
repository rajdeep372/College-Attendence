"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GraduationCap, 
  ShieldCheck, 
  Bell, 
  Building2, 
  Menu, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  Trash2, 
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Award,
  BookOpen,
  Calendar,
  Layers
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { UserButton, useUser } from "@clerk/nextjs";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "alert" | "success" | "info" | "circular";
  read: boolean;
  link?: string;
}

interface DepartmentAuditData {
  department: string;
  totalStudents: number;
  totalFaculty: number;
  activeClasses: number;
  attendanceSessionsCount: number;
  averageAttendance: number;
  turnoutText: string;
  geofenceStatus: string;
  timetableSyncText: string;
}

export function DashboardAppBar() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();

  // Interactive UI States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuditsOpen, setIsAuditsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [auditData, setAuditData] = useState<DepartmentAuditData | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Close menus on path navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsAuditsOpen(false);
  }, [pathname]);

  // Fetch real user notifications strictly from MongoDB
  useEffect(() => {
    async function fetchRealNotifications() {
      try {
        setIsLoadingNotifications(true);
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.warn("Failed to fetch real notifications:", err);
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    }
    fetchRealNotifications();
  }, [pathname]);

  // Fetch real department audit aggregation when opened
  useEffect(() => {
    if (isAuditsOpen) {
      setIsLoadingAudit(true);
      fetch("/api/department/audit")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAuditData(data);
          }
        })
        .catch((err) => console.warn("Failed to fetch department audit:", err))
        .finally(() => setIsLoadingAudit(false));
    }
  }, [isAuditsOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      console.warn("Failed to persist mark all read in MongoDB:", err);
    }
  };

  const handleClearNotifications = async () => {
    setNotifications([]);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      console.warn("Failed to clear notifications in MongoDB:", err);
    }
  };

  const handleNotificationClick = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn("Failed to persist notification read state in MongoDB:", err);
    }
  };

  // Determine role from pathname
  const currentRole = pathname.includes("/principal")
    ? "Principal"
    : pathname.includes("/hod")
    ? "HOD"
    : pathname.includes("/teacher")
    ? "Teacher"
    : "Student";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-sky-500/20 bg-slate-950/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
          
          {/* Left: Crest & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsNotificationsOpen(false);
                setIsAuditsOpen(false);
              }}
              className="lg:hidden p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer pointer-events-auto relative z-50 shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-sky-400" />
              ) : (
                <Menu className="w-5 h-5 text-slate-200" />
              )}
            </button>

            {/* University Crest */}
            <Link
              href={`/dashboard/${currentRole.toLowerCase()}`}
              className="group flex items-center gap-2.5 transition-transform hover:scale-105 shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-white/20 shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Academia<span className="text-sky-400">Sync</span>
                </span>
                <span className="block text-[9px] text-sky-400/80 -mt-1 font-mono tracking-wider uppercase">
                  {currentRole} Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Department Audits Quick-Pill (Interactive Button) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAuditsOpen(!isAuditsOpen);
                setIsNotificationsOpen(false);
              }}
              className="group relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 border border-sky-400/30 text-xs text-sky-200 transition-all cursor-pointer pointer-events-auto shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:border-sky-400/60"
              title="Click to view Departmental Compliance & Audits"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-[11px] sm:text-xs">Department Audits</span>
              <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                96.4%
              </span>
            </button>
          </div>

          {/* Right: Actions, Utilities & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <InstallPwaPrompt />
              <ThemeToggle />
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsAuditsOpen(false);
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer pointer-events-auto relative shrink-0 ${
                  isNotificationsOpen
                    ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "bg-slate-900/60 hover:bg-slate-800/80 border-sky-500/20 text-slate-300 hover:text-sky-400"
                }`}
                aria-label="Notifications"
                title="Notifications & Advisory Feed"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Framer Motion Interactive Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    {/* Backdrop for click outside */}
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
                      onClick={() => setIsNotificationsOpen(false)}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-3xl bg-slate-900/95 border border-sky-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-50 overflow-hidden pointer-events-auto"
                    >
                      {/* Notifications Header */}
                      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-400" />
                          <h3 className="text-xs sm:text-sm font-bold text-white">
                            Institutional Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {unreadCount} new
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors text-[11px] flex items-center gap-1 cursor-pointer pointer-events-auto"
                            title="Mark all as read"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleClearNotifications}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors text-[11px] flex items-center gap-1 cursor-pointer pointer-events-auto"
                            title="Clear all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
                            <div className="font-semibold text-slate-300">No new notifications</div>
                            <p className="text-[11px] text-slate-500 mt-0.5">You are completely up to date.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isAlert = notif.type === "alert";
                            const isSuccess = notif.type === "success";
                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id)}
                                className={`p-3.5 transition-colors cursor-pointer pointer-events-auto flex items-start gap-3 hover:bg-slate-800/60 ${
                                  !notif.read ? "bg-sky-500/5" : ""
                                }`}
                              >
                                <div
                                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                    isAlert
                                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                      : isSuccess
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                  }`}
                                >
                                  {isAlert ? (
                                    <AlertCircle className="w-4 h-4" />
                                  ) : isSuccess ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p
                                      className={`text-xs font-semibold truncate ${
                                        !notif.read ? "text-white" : "text-slate-300"
                                      }`}
                                    >
                                      {notif.title}
                                    </p>
                                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                      {notif.time}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                </div>

                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-2 shrink-0" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Synced live with college ledger</span>
                        <button
                          type="button"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="font-semibold text-sky-400 hover:text-sky-300 cursor-pointer pointer-events-auto"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Clerk User Button */}
            {isSignedIn ? (
              <div className="p-0.5 rounded-full border border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)] shrink-0">
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10 shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                  AS
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* DEPARTMENT AUDITS QUICK MODAL / DROPDOWN                       */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isAuditsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsAuditsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-50 w-full max-w-md bg-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(56,189,248,0.2)] text-white pointer-events-auto my-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Department Audits & Compliance</h3>
                    <p className="text-xs text-sky-400 font-semibold truncate max-w-[220px]">
                      {auditData?.department || "Institutional Department Ledger"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuditsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer pointer-events-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Department Turnout Index</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {isLoadingAudit ? "Aggregating..." : auditData?.turnoutText || "0.0% Compliance"}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Enrolled Scholars</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono">
                    {isLoadingAudit ? "..." : `${auditData?.totalStudents ?? 0} Students`}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Active Faculty & Classes</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {isLoadingAudit ? "..." : `${auditData?.activeClasses ?? 0} Classes (${auditData?.totalFaculty ?? 0} Faculty)`}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Active Geofence Status</span>
                  <span className="px-2.5 py-1 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
                    {auditData?.geofenceStatus || "Operational (≤50m)"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900/60 border border-sky-500/20 text-[11px] text-slate-300">
                  <p className="leading-relaxed">
                    Official attendance ledgers are cryptographically linked to your institution&apos;s MongoDB cluster and verified against mandatory 75% examination compliance criteria.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditsOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer pointer-events-auto"
                >
                  Dismiss Audit Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MOBILE APP BAR NAVIGATION DRAWER                               */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Slide Down Mobile Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-50 w-full bg-slate-900/98 border-b border-sky-500/30 shadow-2xl p-5 pt-4 text-white overflow-y-auto max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                    AS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AcademiaSync Menu</h3>
                    <p className="text-[10px] text-sky-400">{currentRole} Navigation Hub</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links Grid */}
              <div className="space-y-1.5 text-xs">
                {currentRole === "Student" && (
                  <>
                    <Link
                      href="/dashboard/student"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-sky-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-sky-400" />
                        <span className="font-semibold">Attendance Ledger</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>

                    <Link
                      href="/dashboard/student#id-card"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-sky-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold">Digital Campus ID Card</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAuditsOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-sky-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">Department Audits</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        96.4%
                      </span>
                    </button>

                    <Link
                      href="/dashboard/student#calculator"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-sky-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold">Bunk & Safe Margin</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>

                    <Link
                      href="/dashboard/student#leave"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-sky-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span className="font-semibold">Apply for Leave</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                  </>
                )}

                {currentRole === "Principal" && (
                  <>
                    <Link
                      href="/dashboard/principal"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-purple-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold">Institutional Pulse</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>

                    <Link
                      href="/dashboard/principal#departments"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-purple-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold">Department Audits & Roster</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                  </>
                )}

                {currentRole === "Teacher" && (
                  <>
                    <Link
                      href="/dashboard/teacher"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-emerald-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">Classroom Console</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                  </>
                )}

                {currentRole === "HOD" && (
                  <>
                    <Link
                      href="/dashboard/hod"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 hover:bg-blue-500/20 border border-white/5 text-slate-200 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold">Department Health & Leaves</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Quick Utilities */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <InstallPwaPrompt />
                  <ThemeToggle />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  v2.0 PWA Mobile
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

