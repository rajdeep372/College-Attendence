"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  FileText,
  ChevronDown,
  ShieldCheck,
  X
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface TodayClass {
  _id: string;
  routineId?: string;
  classId?: string;
  code: string;
  title: string;
  time: string;
  department: string;
  academicYear?: string;
  semester: number;
  section: string;
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
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiosk & Context States
  const [isQrActive, setIsQrActive] = useState(false);
  const [activeKioskClass, setActiveKioskClass] = useState<TodayClass | null>(null);
  const [totpPin, setTotpPin] = useState("----");
  const [totpCountdown, setTotpCountdown] = useState(60);
  const [turnoutCount, setTurnoutCount] = useState<{ present: number; absent: number }>({ present: 0, absent: 0 });
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskError, setKioskError] = useState<string | null>(null);

  // Modals
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

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

  const todayClasses = analytics?.todayClasses || [];
  const defaulterList = analytics?.defaulters || [];

  // Function to launch/rotate Kiosk Session strictly tied to a routine class
  const launchKioskForClass = useCallback(async (targetClass: TodayClass) => {
    setActiveKioskClass(targetClass);
    setIsQrActive(true);
    setKioskLoading(true);
    setKioskError(null);

    try {
      const res = await fetch("/api/attendance/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineId: targetClass.routineId || targetClass._id,
          classId: targetClass.classId,
          subject: targetClass.title,
          paperCode: targetClass.code,
          department: targetClass.department,
          academicYear: targetClass.academicYear || "1st Year",
          semester: targetClass.semester,
          section: targetClass.section,
          timeSlot: targetClass.time,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to launch Kiosk session.");
      }

      setTotpPin(data.pin);
      setTotpCountdown(data.remainingSeconds || 60);
      setTurnoutCount({
        present: data.presentCount || 0,
        absent: data.absentCount || 0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initializing Kiosk";
      setKioskError(msg);
    } finally {
      setKioskLoading(false);
    }
  }, []);

  // Primary Action Button Handler (picks live class or first class)
  const handleLaunchPrimaryKiosk = () => {
    if (isQrActive) {
      setIsQrActive(false);
      return;
    }

    if (todayClasses.length === 0) {
      setKioskError("No classes scheduled for today. Kiosk cannot be launched on rest days.");
      setIsQrActive(true);
      return;
    }

    // Prioritize class currently 'Live Now', otherwise first scheduled class
    const liveClass = todayClasses.find((c) => c.status === "Live Now") || todayClasses[0];
    launchKioskForClass(liveClass);
  };

  // Rotating TOTP Countdown and sync
  useEffect(() => {
    if (!isQrActive || !activeKioskClass) return;

    const timer = setInterval(() => {
      setTotpCountdown((prev) => {
        if (prev <= 1) {
          // Time to refresh PIN
          launchKioskForClass(activeKioskClass);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQrActive, activeKioskClass, launchKioskForClass]);

  // Periodic poll for checked-in student turnout
  useEffect(() => {
    if (!isQrActive || !activeKioskClass) return;

    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams({
          routineId: activeKioskClass.routineId || activeKioskClass._id,
          subject: activeKioskClass.title,
        });
        const res = await fetch(`/api/attendance/totp?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.activeSession) {
          setTurnoutCount({
            present: data.activeSession.presentCount || 0,
            absent: data.activeSession.absentCount || 0,
          });
        }
      } catch {
        // Soft fail on polling
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isQrActive, activeKioskClass]);

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
                Broadcast rolling context-aware 4-digit PINs tied strictly to live timetable classes. Enforces strict 50m campus geofence to eliminate proxy attendance.
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
                onClick={handleLaunchPrimaryKiosk}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              >
                <QrCode className="w-5 h-5" />
                <span>{isQrActive ? "Close Dynamic Kiosk" : "Launch Dynamic Kiosk"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Context-Aware Kiosk Projection Panel */}
        {isQrActive && (
          <div className="p-6 sm:p-8 rounded-3xl glass-card border-2 border-emerald-400/50 bg-slate-900/95 shadow-[0_0_60px_rgba(16,185,129,0.25)] animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button
                onClick={() => setIsQrActive(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                aria-label="Close Kiosk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {kioskError ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                <h4 className="text-lg font-bold text-white mb-1">Cannot Launch Kiosk</h4>
                <p className="text-sm text-rose-300 max-w-md mx-auto">{kioskError}</p>
                <button
                  onClick={() => setIsQrActive(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            ) : activeKioskClass ? (
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Visual PIN & Scannable QR Display */}
                <div className="flex flex-col items-center p-6 rounded-2xl bg-white text-slate-900 shadow-2xl shrink-0 w-full sm:w-auto">
                  <div className="p-3 bg-white rounded-xl border-2 border-slate-200">
                    <QRCodeSVG
                      value={`ACADEMIASYNC:PIN:${totpPin}:SUB:${activeKioskClass.title}:SEM:${activeKioskClass.semester}:SEC:${activeKioskClass.section}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="mt-3 w-full text-center">
                    <span className="text-[10px] font-mono tracking-widest text-slate-500 block uppercase">
                      STUDENT TOTP PIN
                    </span>
                    <div className="my-1 px-4 py-1.5 rounded-xl bg-sky-50 border-2 border-sky-400 text-sky-950 inline-block shadow-inner">
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-[0.3em] block pl-1">
                        {kioskLoading ? "••••" : totpPin}
                      </span>
                    </div>

                    {/* Rolling countdown bar */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>Expires in:</span>
                      <span className="font-bold text-emerald-700">{totpCountdown}s</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(totpCountdown / 60) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    <span>Live Context Session Active</span>
                  </div>
                </div>

                {/* Context Details and Headcount */}
                <div className="flex-1 space-y-4 w-full">
                  {/* Context Header */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Active Class Session Context</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Active Session: {activeKioskClass.title} - Sem {activeKioskClass.semester} ({activeKioskClass.section})
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-300 mt-2 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                        Code: {activeKioskClass.code}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Slot: {activeKioskClass.time}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {activeKioskClass.department}
                      </span>
                    </div>
                  </div>

                  {/* Geofence notice */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3 text-xs text-slate-300">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">Strict 50-Meter Geofence Enforced</span>
                      <span className="text-[11px] text-slate-400">
                        Students must submit coordinates within 50m of college premises to check in.
                      </span>
                    </div>
                  </div>

                  {/* Live Turnout Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                        <Users className="w-4 h-4" />
                        <span>Checked In (Present)</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white">
                        {turnoutCount.present} <span className="text-xs text-emerald-400 font-normal">Students</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
                        <Clock className="w-4 h-4" />
                        <span>Pending Check-in</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-white">
                        {turnoutCount.absent} <span className="text-xs text-slate-400 font-normal">Students</span>
                      </div>
                    </div>
                  </div>

                  {/* Switch Class Dropdown if multiple classes exist */}
                  {todayClasses.length > 1 && (
                    <div className="pt-2 flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Switch active session:</span>
                      <select
                        value={activeKioskClass._id + "-" + activeKioskClass.title}
                        onChange={(e) => {
                          const selected = todayClasses.find(
                            (c) => c._id + "-" + c.title === e.target.value
                          );
                          if (selected) launchKioskForClass(selected);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-medium focus:outline-none focus:border-sky-400 cursor-pointer"
                      >
                        {todayClasses.map((cls, idx) => (
                          <option key={cls._id + idx} value={cls._id + "-" + cls.title}>
                            {cls.title} (Sem {cls.semester} &bull; {cls.section} &bull; {cls.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
                /* STRICT EMPTY STATE: Rest Day 🌴 - No classes scheduled for today. */
                <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-3xl mb-2">🌴</span>
                  <h4 className="text-base font-bold text-white mb-1">
                    Rest Day 🌴 - No classes scheduled for today.
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    No institutional lectures are scheduled for today in the academic timetable. Enjoy your rest day!
                  </p>
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
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>{cls.time}</span>
                        <span>&bull;</span>
                        <span>{cls.hall}</span>
                        <span>&bull;</span>
                        <span className="text-amber-300 font-medium">Sem {cls.semester} ({cls.section})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                      {/* Launch Kiosk Button for this specific class */}
                      <button
                        onClick={() => launchKioskForClass(cls)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isQrActive && activeKioskClass?._id === cls._id && activeKioskClass?.title === cls.title
                            ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                            : cls.status === "Live Now"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                        title="Launch attendance Kiosk for this lecture"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>
                          {isQrActive && activeKioskClass?._id === cls._id && activeKioskClass?.title === cls.title
                            ? "Active"
                            : "Launch Kiosk"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
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
