import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RoutineUploadDropzone } from "@/components/routine/RoutineUploadDropzone";
import { AtRiskStudentsCard } from "@/components/dashboard/AtRiskStudentsCard";
import { 
  Award, 
  Users, 
  Clock, 
  FileCheck, 
  BookMarked,
  UserCheck,
  CalendarCheck,
  Sparkles
} from "lucide-react";

async function HodDashboardContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  if (currentUser.role.toLowerCase() !== "hod") {
    redirect(`/dashboard/${currentUser.role.toLowerCase()}`);
  }

  const departmentStats = [
    { label: "Branch Attendance", value: "96.4%", sub: "Computer Science Dept", icon: UserCheck, color: "from-blue-500 to-indigo-600" },
    { label: "Active Faculty Today", value: "24 / 25", sub: "1 on Medical Leave", icon: Users, color: "from-cyan-500 to-blue-600" },
    { label: "Classes Conducted", value: "38 / 42", sub: "4 currently in progress", icon: Clock, color: "from-emerald-500 to-teal-600" },
    { label: "Pending Leave Requests", value: "7", sub: "Requires HOD Sanction", icon: FileCheck, color: "from-amber-500 to-orange-600" },
  ];

  const pendingLeaves = [
    { student: "Aarav Patel", roll: "CSE-2023-045", days: "2 Days (Medical)", date: "Today, 09:30 AM" },
    { student: "Sneha Rao", roll: "CSE-2022-112", days: "3 Days (Hackathon On-Duty)", date: "Yesterday" },
    { student: "Kavya Menon", roll: "CSE-2024-018", days: "1 Day (Family Event)", date: "06 Nov" },
  ];

  return (
    <RoleGuard allowedRole="HOD" user={currentUser}>
      <div className="space-y-8 animate-fade-in">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={currentUser} defaultRole="HOD" />

        {/* Welcome Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-blue-500/30 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Department Administration & Academic Command</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Department Operations & Faculty Schedule Oversight
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Supervise branch lecture conduction, faculty allotments, student leave sanctions, and course syllabus velocity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer">
                <CalendarCheck className="w-4 h-4" />
                <span>Review Timetable Schedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {departmentStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="p-5 rounded-2xl glass-card glass-card-interactive border border-white/10 hover:border-blue-400/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${stat.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-2 text-xs text-sky-400 font-medium">
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Routine Upload & Sync Station */}
        <RoutineUploadDropzone defaultDepartment={currentUser?.department || "Computer Science"} />

        {/* At-Risk Students & Automated Disciplinary Warnings */}
        <AtRiskStudentsCard />

        {/* Pending Approvals & Syllabus Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Pending Leave Authorizations</h3>
                <p className="text-xs text-slate-400">Student medical leaves and official on-duty approvals</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Action Required
              </span>
            </div>

            <div className="space-y-3">
              {pendingLeaves.map((leave, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-sm text-white">{leave.student}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {leave.roll} &bull; <span className="text-sky-300 font-medium">{leave.days}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer">
                      Sanction
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-white/10 transition-all cursor-pointer">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookMarked className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Syllabus Completion</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Semester 5 (CS501-506)</span>
                    <span className="text-sky-400 font-semibold">78% completed</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Semester 3 (CS301-305)</span>
                    <span className="text-sky-400 font-semibold">82% completed</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "82%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Semester 7 (CS701-704)</span>
                    <span className="text-emerald-400 font-semibold">91% completed</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "91%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button className="w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/30 text-blue-300 transition-all cursor-pointer">
                Download Branch Accreditation Audit &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

export default function HodDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HodDashboardContent />
    </Suspense>
  );
}
