import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { StudentTotpGeofenceCard } from "@/components/attendance/StudentTotpGeofenceCard";
import { 
  BookOpen, 
  MapPin, 
  QrCode, 
  FileText, 
  Sparkles,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

async function StudentDashboardContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  // Strict Authoritative RBAC: Students can only view the Student dashboard
  if (currentUser.role.toLowerCase() !== "student") {
    redirect(`/dashboard/${currentUser.role.toLowerCase()}`);
  }

  const subjects = [
    { code: "CS-501", name: "Operating Systems", attended: 36, total: 40, percent: 90.0, status: "safe" },
    { code: "CS-502", name: "Distributed Cloud Systems", attended: 32, total: 35, percent: 91.4, status: "safe" },
    { code: "CS-503", name: "Design & Analysis of Algorithms", attended: 29, total: 38, percent: 76.3, status: "warning" },
    { code: "CS-504", name: "Database Management Systems", attended: 34, total: 36, percent: 94.4, status: "safe" },
  ];

  return (
    <RoleGuard allowedRole="Student" user={currentUser}>
      <div className="space-y-8 animate-fade-in">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={currentUser} defaultRole="Student" />

        {/* Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-500/30 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Academic Ledger & Attendance Pulse</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Personal Attendance, ID Card & Safe Margins
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Real-time lecture presence monitoring, automated examination eligibility verification, and on-duty leave submissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer">
                <FileText className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Student Geofenced TOTP Attendance Check-In Card */}
        <StudentTotpGeofenceCard studentId={currentUser?._id?.toString()} />

        {/* Top 3D Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dial Card */}
          <div className="p-6 rounded-3xl glass-card border border-sky-500/30 flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-sky-500/20 blur-2xl" />
            
            <div className="relative w-36 h-36 rounded-full border-8 border-sky-500/20 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.25)]">
              <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-200">
                88.5%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">
                Aggregated
              </span>
            </div>

            <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Examination Eligible (&gt;75%)</span>
            </div>
          </div>

          {/* Digital Holographic Campus ID Card */}
          <div className="p-6 rounded-3xl glass-card border border-white/15 bg-gradient-to-br from-slate-900/90 to-sky-950/80 shadow-[0_0_30px_rgba(56,189,248,0.15)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-sky-400 font-bold">
                  Digital Campus ID
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {currentUser?.name || "Aryan Sharma"}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  ID: {currentUser?.clerkId ? currentUser.clerkId.slice(-8).toUpperCase() : "2023-CSE-094"}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-white">
                <QrCode className="w-6 h-6" />
              </div>
            </div>

            <div className="my-3 py-2 border-y border-white/10 flex justify-between text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 block">Department</span>
                <span>{currentUser?.department || "Computer Science"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Batch</span>
                <span>2023 - 2027</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Section</span>
                <span>CSE-B</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Geofence: Inside Campus</span>
              </div>
              <MapPin className="w-4 h-4 text-sky-400" />
            </div>
          </div>

          {/* Safe Margin Calculator */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Bunk & Safety Margin</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Real-time safety calculations based on 75% institutional limit:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-300">Allowed Missed Lectures:</span>
                  <span className="font-bold text-emerald-400">Up to 6 Classes</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-300">Warning Subject:</span>
                  <span className="font-bold text-amber-400">Algorithms (76.3%)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
              Next scheduled lecture: <strong className="text-sky-300">CS-504 Database Systems at 11:30 AM</strong>
            </div>
          </div>
        </div>

        {/* Subject-Wise Ledger */}
        <div className="p-6 rounded-3xl glass-card border border-white/10">
          <h3 className="text-lg font-bold text-white mb-1">Subject-Wise Attendance Ledger</h3>
          <p className="text-xs text-slate-400 mb-6">Detailed lecture logs and absence tracking</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-xs text-sky-400 font-bold">{sub.code}</span>
                    <div className="font-semibold text-sm text-white mt-0.5">{sub.name}</div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      sub.percent >= 85
                        ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/30"
                        : "text-amber-400 bg-amber-950/60 border border-amber-500/30"
                    }`}
                  >
                    {sub.percent.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      sub.percent >= 85
                        ? "bg-gradient-to-r from-sky-500 to-emerald-400"
                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                    }`}
                    style={{ width: `${sub.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>{sub.attended} Attended of {sub.total} Classes</span>
                  <span>{sub.total - sub.attended} Missed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}
