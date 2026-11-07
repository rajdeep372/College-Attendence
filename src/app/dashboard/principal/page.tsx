import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { RoutineUploadDropzone } from "@/components/routine/RoutineUploadDropzone";
import { AtRiskStudentsCard } from "@/components/dashboard/AtRiskStudentsCard";
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  FileSpreadsheet, 
  Send,
  Sparkles,
  CheckCircle2
} from "lucide-react";

async function PrincipalDashboardContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  if (currentUser.role.toLowerCase() !== "principal") {
    redirect(`/dashboard/${currentUser.role.toLowerCase()}`);
  }

  const stats = [
    {
      label: "Campus Overall Attendance",
      value: "94.8%",
      change: "+2.1% from last month",
      trend: "up",
      glow: "rgba(56, 189, 248, 0.3)",
      color: "from-sky-500 to-blue-600",
      icon: TrendingUp,
    },
    {
      label: "Faculty On-Duty Today",
      value: "144 / 150",
      change: "6 on approved duty leave",
      trend: "neutral",
      glow: "rgba(168, 85, 247, 0.3)",
      color: "from-purple-500 to-indigo-600",
      icon: Users,
    },
    {
      label: "Departments Active",
      value: "8 / 8",
      change: "100% compliance",
      trend: "up",
      glow: "rgba(16, 185, 129, 0.3)",
      color: "from-emerald-500 to-teal-600",
      icon: Building2,
    },
    {
      label: "Institutional Safety Score",
      value: "99.2%",
      change: "Geofence active college-wide",
      trend: "up",
      glow: "rgba(245, 158, 11, 0.3)",
      color: "from-amber-500 to-orange-600",
      icon: ShieldCheck,
    },
  ];

  const departmentRanks = [
    { name: "Computer Science & Engineering", attendance: "97.4%", students: 480, hod: "Dr. A. Sharma" },
    { name: "Electronics & Communication", attendance: "95.2%", students: 360, hod: "Dr. R. Verma" },
    { name: "Mechanical Engineering", attendance: "93.8%", students: 320, hod: "Dr. K. Iyer" },
    { name: "Civil Engineering", attendance: "92.5%", students: 280, hod: "Dr. S. Nair" },
  ];

  return (
    <RoleGuard allowedRole="Principal" user={currentUser}>
      <div className="space-y-8 animate-fade-in">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={currentUser} defaultRole="Principal" />

        {/* Top Welcome Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Institutional Leadership</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Institutional Governance & Compliance Ledger
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Campus-wide oversight of department attendance indices, faculty lecture compliance, and biometric audit logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer">
                <Send className="w-4 h-4" />
                <span>Broadcast Campus Circular</span>
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 transition-all cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Audit Sheet</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="group relative p-5 rounded-2xl glass-card glass-card-interactive border border-white/10 hover:border-purple-400/50"
              >
                <div
                  className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                  style={{ backgroundColor: stat.glow }}
                />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${stat.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-sky-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{stat.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Routine Upload & Sync Station */}
        <RoutineUploadDropzone defaultDepartment="Computer Science" />

        {/* At-Risk Students & Automated Disciplinary Warnings */}
        <AtRiskStudentsCard />

        {/* Department Overview & Real-time Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Departmental Attendance Index</h3>
                <p className="text-xs text-slate-400">Live attendance feed compiled from today&apos;s lectures</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Sync
              </span>
            </div>

            <div className="space-y-4">
              {departmentRanks.map((dept, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 border border-white/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-200">{dept.name}</div>
                    <div className="text-sm font-bold text-purple-400">{dept.attendance}</div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full"
                      style={{ width: dept.attendance }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>HOD: {dept.hod}</span>
                    <span>{dept.students} Students Enrolled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Institutional Alerts</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/70 border-l-4 border-l-amber-500 border border-white/5">
                  <p className="font-semibold text-slate-200">CSE Department - Lecture Delay Alert</p>
                  <p className="text-slate-400 mt-1">CS-302 Lecture by Prof. Mehta delayed by 15 mins. Geofence logged.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/70 border-l-4 border-l-sky-500 border border-white/5">
                  <p className="font-semibold text-slate-200">Monthly Attendance Cut-Off Notice</p>
                  <p className="text-slate-400 mt-1">Auto-generated parent alerts prepared for 42 defaulter students (&lt;75%).</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button className="w-full py-2.5 rounded-xl text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 transition-all cursor-pointer">
                Review Defaulter Sanction List &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

export default function PrincipalDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PrincipalDashboardContent />
    </Suspense>
  );
}
