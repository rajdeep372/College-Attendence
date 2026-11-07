"use client";

import React, { useState } from "react";
import { SerializedUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { AbsentFirstGridView } from "@/components/attendance/AbsentFirstGridView";
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
  RefreshCw
} from "lucide-react";

export function TeacherDashboardClient({ user }: { user: SerializedUser | null }) {
  const [isQrActive, setIsQrActive] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(58);
  const [tokenCounter, setTokenCounter] = useState(14);
  const [totpPin, setTotpPin] = useState("8421");
  const totalStudents = 64;

  React.useEffect(() => {
    async function fetchTotp() {
      try {
        const res = await fetch("/api/attendance/totp");
        const data = await res.json();
        if (data.success && data.code) {
          setTotpPin(data.code);
        }
      } catch {
        // Fallback to default
      }
    }
    fetchTotp();
    const interval = setInterval(fetchTotp, 15000);
    return () => clearInterval(interval);
  }, []);

  const todayClasses = [
    { code: "CS-502", title: "Distributed Systems & Cloud", time: "10:00 AM - 11:00 AM", hall: "Lab 3B", status: "Completed", attendance: "61 / 64 (95.3%)" },
    { code: "CS-504", title: "Database Architecture", time: "11:30 AM - 12:30 PM", hall: "Seminar Room 1", status: "Live Now", attendance: `${attendanceCount} / 64 (${Math.round((attendanceCount / 64) * 100)}%)` },
    { code: "CS-508", title: "Compiler Design Lab", time: "02:00 PM - 04:00 PM", hall: "Systems Lab A", status: "Upcoming", attendance: "Pending" },
  ];

  const defaulterList = [
    { name: "Vikram Malhotra", roll: "22CS089", percentage: "64.2%", absences: 9 },
    { name: "Pooja Hegde", roll: "22CS034", percentage: "68.5%", absences: 8 },
    { name: "Rohan Verma", roll: "22CS102", percentage: "71.0%", absences: 7 },
  ];

  return (
    <RoleGuard allowedRole="Teacher" user={user}>
      <div className="space-y-8 animate-fade-in">
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
                  <span>Geofencing Active &bull; Hall CS-301 Radius: 50m</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Live Attendance Conduction &bull; CS-504
                </h3>
                <p className="text-sm text-slate-300">
                  Students must scan this code using their installed AcademiaSync PWA inside the physical lecture hall.
                </p>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-emerald-400">
                      {attendanceCount} / {totalStudents}
                    </div>
                    <div className="text-xs text-slate-400">Marked Present in Real-Time</div>
                  </div>

                  <button
                    onClick={() => setAttendanceCount((prev) => Math.min(prev + 1, totalStudents))}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Simulate Student Check-In</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Absent-First Fast Attendance Station */}
        <AbsentFirstGridView />

        {/* Grid: Schedule & Defaulter Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Today&apos;s Lecture Schedule</h3>
                <p className="text-xs text-slate-400">Assigned courses and live student turnout</p>
              </div>
              <Clock className="w-5 h-5 text-sky-400" />
            </div>

            <div className="space-y-4">
              {todayClasses.map((cls, idx) => (
                <div
                  key={idx}
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
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">Attendance Defaulter Alerts</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Students requiring warning notices (&lt;75% attendance threshold):
              </p>

              <div className="space-y-3">
                {defaulterList.map((st, i) => (
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
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 text-rose-300 transition-all cursor-pointer">
                Dispatch Parent Advisory Notice
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

