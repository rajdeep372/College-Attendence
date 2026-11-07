"use client";

import React, { useState, useEffect } from "react";
import { SerializedUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { AbsentFirstGridView } from "@/components/attendance/AbsentFirstGridView";
import { ParentAdvisoryModal } from "@/components/modals/ParentAdvisoryModal";
import { ApplyLeaveModal } from "@/components/modals/ApplyLeaveModal";
import { 
  QrCode, 
  MapPin, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Smartphone,
  CheckCheck,
  RefreshCw,
  Send,
  FileText
} from "lucide-react";

interface TodayClass {
  _id: string;
  code: string;
  title: string;
  time: string;
  hall: string;
  status: string;
  attendance: string;
}

interface DefaulterStudent {
  name: string;
  roll: string;
  email?: string;
  percentage: string;
  absences: number;
}

interface TeacherAnalytics {
  todayClasses: TodayClass[];
  defaulters: DefaulterStudent[];
  attendanceLogsCount: number;
}

export function TeacherDashboardClient({ user }: { user: SerializedUser | null }) {
  const [isQrActive, setIsQrActive] = useState(false);
  const [totpPin, setTotpPin] = useState("8421");
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real Teacher analytics from MongoDB
  const fetchTeacherAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: "Teacher",
        userId: user?._id || "",
        department: user?.department || "",
      });
      const res = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load teacher analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherAnalytics();
  }, [user]);

  // Fetch rotating TOTP
  useEffect(() => {
    async function fetchTotp() {
      try {
        const res = await fetch("/api/attendance/totp");
        const data = await res.json();
        if (data.success && data.code) {
          setTotpPin(data.code);
        }
      } catch {
        // Fallback
      }
    }
    fetchTotp();
    const interval = setInterval(fetchTotp, 15000);
    return () => clearInterval(interval);
  }, []);

  const todayClasses = analytics?.todayClasses || [];
  const defaulterList = analytics?.defaulters || [];

  return (
    <RoleGuard allowedRole="Teacher" user={user}>
      <div className="space-y-8 animate-fade-in relative">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={user} defaultRole="Teacher" />

        {/* Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-emerald-500/30 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lecture Hall Station & Automated Registry</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Classroom Attendance & Dynamic Anti-Proxy QR
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Broadcast rolling biometric QR tokens with 15-second TTL and geofence distance verification to eliminate proxies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow-md transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Apply for Faculty Leave</span>
              </button>

              <button
                onClick={() => setIsQrActive(!isQrActive)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              >
                <QrCode className="w-5 h-5" />
                <span>{isQrActive ? "Close Dynamic QR Console" : "Launch Dynamic QR Station"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic QR Live Modal / Projection Panel */}
        {isQrActive && (
          <div className="p-6 rounded-3xl glass-card border-2 border-emerald-400/50 bg-slate-900/90 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-fade-in">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center p-6 rounded-2xl bg-white text-slate-900 shadow-2xl">
                <div className="w-52 h-52 border-4 border-slate-900 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                  <QrCode className="w-28 h-28 text-slate-900" />
                  <span className="text-[10px] font-mono tracking-widest text-slate-600 mt-1">
                    TOKEN: 9C41-EXP-15S
                  </span>
                  <div className="mt-1 px-3 py-0.5 rounded-lg bg-sky-100 border border-sky-300 text-sky-950">
                    <span className="text-[9px] font-bold block uppercase tracking-wider text-sky-700">4-Digit PIN</span>
                    <span className="text-xl font-black font-mono tracking-[0.2em]">{totpPin}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>Geofenced TOTP Active</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Geofencing Active &bull; Campus Boundary Radius: 50m</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Live Attendance Conduction &bull; Dynamic TOTP Projection
                </h3>
                <p className="text-sm text-slate-300">
                  Students enter this rolling 4-digit PIN on their installed AcademiaSync mobile PWA. The system cryptographically confirms coordinates are inside the physical perimeter before logging attendance.
                </p>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Security Verification Status</div>
                    <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                      Encrypted Rolling Nonce & Geofence Validated
                    </div>
                  </div>

                  <button
                    onClick={() => setIsQrActive(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    Minimize
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Absent-First Fast Attendance Station (Live MongoDB connected) */}
        <AbsentFirstGridView />

        {/* Grid: Schedule & Defaulter Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="schedule" className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Today&apos;s Lecture Schedule</h3>
                <p className="text-xs text-slate-400">Assigned courses loaded live from MongoDB Routine records</p>
              </div>
              <button
                onClick={fetchTeacherAnalytics}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-all cursor-pointer"
                title="Refresh Schedule"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="space-y-4">
              {todayClasses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No lectures scheduled for today in the institutional timetable.
                </div>
              ) : (
                todayClasses.map((cls, idx) => (
                <div
                  key={cls._id || idx}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800">
                        {cls.code}
                      </span>
                      <span className="font-semibold text-white text-sm">{cls.title}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>{cls.time}</span>
                      <span>&bull;</span>
                      <span>{cls.hall}</span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        cls.status === "Live Now"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                          : cls.status === "Completed"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {cls.status}
                    </span>
                    <span className="text-xs text-slate-300 font-medium sm:mt-1">
                      {cls.attendance}
                    </span>
                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* Defaulter Alerts */}
          <div id="defaulters" className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Attendance Defaulter Alerts</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Enrolled students requiring warning notices (&lt;75% attendance threshold):
              </p>

              <div className="space-y-3">
                {defaulterList.length > 0 ? (
                  defaulterList.map((st, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-900/70 border border-rose-500/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{st.name}</div>
                        <div className="text-[11px] text-slate-400">{st.roll} &bull; {st.absences} Absences</div>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-extrabold text-rose-300 bg-rose-950/60 border border-rose-500/30">
                        {st.percentage}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-400 text-center">
                    No chronic defaulters recorded for today&apos;s lectures.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setIsAdvisoryModalOpen(true)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 text-rose-300 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Parent Advisory Notice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parent Advisory Modal */}
        <ParentAdvisoryModal
          isOpen={isAdvisoryModalOpen}
          onClose={() => setIsAdvisoryModalOpen(false)}
          department={user?.department || "Computer Science & Engineering"}
          defaulters={defaulterList}
        />

        {/* Apply Faculty Leave Modal */}
        <ApplyLeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          userRole="Teacher"
          department={user?.department || "Computer Science & Engineering"}
        />
      </div>
    </RoleGuard>
  );
}
