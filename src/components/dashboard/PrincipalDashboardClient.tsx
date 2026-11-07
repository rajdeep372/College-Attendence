"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SerializedUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { RoutineUploadDropzone } from "@/components/routine/RoutineUploadDropzone";
import { AtRiskStudentsCard } from "@/components/dashboard/AtRiskStudentsCard";
import { BroadcastCircularModal } from "@/components/modals/BroadcastCircularModal";
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  FileSpreadsheet, 
  Send,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Download,
  Crown,
  Search,
  Check,
  X,
  UserCheck,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
  Eye,
  Calendar,
  ExternalLink,
  Filter
} from "lucide-react";
import Image from "next/image";

interface DepartmentTeacher {
  _id: string;
  name: string;
  email: string;
  designation: string;
  profilePicture?: string;
  routinesCount: number;
}

interface DepartmentHod {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  profilePicture?: string;
}

interface DepartmentOverview {
  name: string;
  hod: DepartmentHod | null;
  teachers: DepartmentTeacher[];
  studentCount: number;
  routinesCount: number;
  attendanceRate: string;
}

interface StudentStat {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  semester: number;
  section: string;
  profilePicture?: string;
  idCardSoftCopy?: string;
  attendancePercentage: number;
  totalClasses: number;
  attendedClasses: number;
}

interface PendingLeaveItem {
  _id: string;
  applicantName: string;
  applicantRole: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  applicantId?: {
    _id?: string;
    name?: string;
    email?: string;
    rollNumber?: string;
    department?: string;
    role?: string;
  };
}

interface PrincipalAnalytics {
  stats: Array<{
    label: string;
    value: string;
    change: string;
    trend: string;
    glow: string;
    color: string;
  }>;
  departmentsOverview: DepartmentOverview[];
  allStudents: StudentStat[];
  allPendingLeaves: PendingLeaveItem[];
  totalStudents: number;
  totalFaculty: number;
  totalRoutines: number;
  activeDepartments: string[];
}

export function PrincipalDashboardClient({ user }: { user: SerializedUser | null }) {
  const [analytics, setAnalytics] = useState<PrincipalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  // God-Mode HOD Switcher State
  const [operatingAsDept, setOperatingAsDept] = useState<string>("Computer Science & Engineering");
  const [leaveActionInProgress, setLeaveActionInProgress] = useState<string | null>(null);
  const [leaveStatusMessage, setLeaveStatusMessage] = useState<string | null>(null);

  // Student Directory Filter/Search
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentDeptFilter, setStudentDeptFilter] = useState("All");

  // Selected Student ID Card Preview Modal
  const [previewIdCardUrl, setPreviewIdCardUrl] = useState<string | null>(null);

  const fetchPrincipalAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: "Principal",
      });
      const res = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
        if (data.analytics.departmentsOverview?.length > 0 && !operatingAsDept) {
          setOperatingAsDept(data.analytics.departmentsOverview[0].name);
        }
      }
    } catch (err) {
      console.error("Error fetching principal analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrincipalAnalytics();
  }, [user]);

  // Export full campus audit sheet (.xlsx)
  const handleExportAuditSheet = (dept?: string) => {
    const url = dept
      ? `/api/attendance/export?department=${encodeURIComponent(dept)}`
      : `/api/attendance/export`;
    window.location.href = url;
  };

  // God-Mode: Sanction or Reject any leave across any department
  const handleLeaveDecision = async (leaveId: string, status: "Approved" | "Rejected") => {
    setLeaveActionInProgress(leaveId);
    setLeaveStatusMessage(null);
    try {
      const res = await fetch("/api/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status,
          decisionNotes: `Sanctioned by Supreme Principal Administration (${user?.name || "Principal Super-Admin"})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update leave");
      }

      setLeaveStatusMessage(`Leave successfully marked as ${status}. Notification dispatched.`);
      fetchPrincipalAnalytics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating leave.";
      setLeaveStatusMessage(`Action Failed: ${msg}`);
    } finally {
      setLeaveActionInProgress(null);
    }
  };

  const statIcons = [TrendingUp, Users, Building2, ShieldCheck];

  const defaultStats = [
    {
      label: "Campus Overall Attendance",
      value: "0.0%",
      change: "Real-time Biometric Ledger",
      trend: "up",
      glow: "rgba(56, 189, 248, 0.3)",
      color: "from-sky-500 to-blue-600",
    },
    {
      label: "Faculty Registered",
      value: `${analytics?.totalFaculty || 0} Members`,
      change: "Campus-Wide Active Faculty",
      trend: "neutral",
      glow: "rgba(168, 85, 247, 0.3)",
      color: "from-purple-500 to-indigo-600",
    },
    {
      label: "Active Departments",
      value: `${analytics?.departmentsOverview?.length || 0} Units`,
      change: "Institutional Compliance",
      trend: "up",
      glow: "rgba(16, 185, 129, 0.3)",
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "Total Enrolled Scholars",
      value: `${analytics?.totalStudents || 0} Students`,
      change: "Database Registered Cohort",
      trend: "up",
      glow: "rgba(245, 158, 11, 0.3)",
      color: "from-amber-500 to-orange-600",
    },
  ];

  const displayStats = analytics?.stats || defaultStats;
  const departmentsOverview = analytics?.departmentsOverview || [];
  const allStudents = analytics?.allStudents || [];
  const allPendingLeaves = analytics?.allPendingLeaves || [];

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
      const matchesSearch =
        st.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        st.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        st.email.toLowerCase().includes(studentSearchQuery.toLowerCase());
      const matchesDept =
        studentDeptFilter === "All" || st.department === studentDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [allStudents, studentSearchQuery, studentDeptFilter]);

  // Leaves filtered for the currently operated HOD department
  const leavesForOperatingDept = useMemo(() => {
    return allPendingLeaves.filter(
      (l) => l.department?.toLowerCase() === operatingAsDept?.toLowerCase()
    );
  }, [allPendingLeaves, operatingAsDept]);

  return (
    <RoleGuard allowedRole="Principal" user={user}>
      <div className="space-y-8 animate-fade-in relative">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={user} defaultRole="Principal" />

        {/* Top Welcome Banner with God-Mode Badge */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-purple-500/30 overflow-hidden shadow-[0_8px_32px_rgba(168,85,247,0.15)]">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>SUPREME PRINCIPAL &bull; GOD-MODE ACTIVE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Institutional Governance & Executive Cockpit
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Unrestricted administrative oversight across all academic departments, faculty rosters, student biometric records, and timetable routines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsBroadcastModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Circular</span>
              </button>

              <button
                onClick={() => handleExportAuditSheet()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Campus Excel (.xlsx)</span>
              </button>

              <button
                onClick={fetchPrincipalAnalytics}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 transition-all cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-4 h-4 text-sky-400 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayStats.map((stat, i) => {
            const Icon = statIcons[i % statIcons.length];
            return (
              <div
                key={i}
                className="group relative p-5 rounded-2xl glass-card glass-card-interactive border border-white/10 hover:border-purple-400/50 transition-all"
              >
                <div
                  className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                  style={{ backgroundColor: stat.glow || "rgba(168, 85, 247, 0.3)" }}
                />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${stat.color} text-white shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-sky-400 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{stat.change}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* 1. HOD CONTEXT SWITCHER & PROXY COMMAND CONSOLE                */}
        {/* ============================================================== */}
        <section className="p-6 sm:p-8 rounded-3xl glass-card border border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-slate-900/40 to-slate-950/60 shadow-[0_8px_32px_rgba(245,158,11,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Crown className="w-3.5 h-3.5" />
                <span>God-Mode HOD Context Switcher</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Operate As Head of Department (HOD Proxy)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Seamlessly step into any department head&apos;s shoes to upload curriculum routines, sanction pending leaves, and inspect timetable matrices.
              </p>
            </div>

            {/* Department Selection Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300 shrink-0">Command Dept:</label>
              <select
                value={operatingAsDept}
                onChange={(e) => setOperatingAsDept(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-lg"
              >
                {departmentsOverview.map((dept) => (
                  <option key={dept.name} value={dept.name} className="bg-slate-900 text-white">
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You are currently commanding <strong className="text-white underline">{operatingAsDept}</strong>. Routines uploaded below will automatically bind to this department.
              </span>
            </div>
            <button
              onClick={() => handleExportAuditSheet(operatingAsDept)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {operatingAsDept} Sheet (.xlsx)</span>
            </button>
          </div>

          {/* Routine Upload for Selected Department */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Upload Class Routine for {operatingAsDept}</span>
            </h3>
            <RoutineUploadDropzone 
              key={operatingAsDept} 
              defaultDepartment={operatingAsDept} 
            />
          </div>

          {/* Department Pending Leaves Sanction Hub */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pending Leave Sanctions for {operatingAsDept}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Directly sanction or reject applications under this department with instant email notification.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {leavesForOperatingDept.length} Pending
              </span>
            </div>

            {leaveStatusMessage && (
              <div className="p-3 mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{leaveStatusMessage}</span>
              </div>
            )}

            {leavesForOperatingDept.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
                No pending leave applications for {operatingAsDept}. All records clear.
              </div>
            ) : (
              <div className="space-y-3">
                {leavesForOperatingDept.map((leave) => (
                  <div
                    key={leave._id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-400/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{leave.applicantName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {leave.applicantRole}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {leave.leaveType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-400">Duration:</strong>{" "}
                        {new Date(leave.startDate).toLocaleDateString()} &rarr; {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400 italic">
                        &quot;{leave.reason}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLeaveDecision(leave._id, "Approved")}
                        disabled={leaveActionInProgress === leave._id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sanction (Approve)</span>
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(leave._id, "Rejected")}
                        disabled={leaveActionInProgress === leave._id}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================== */}
        {/* 2. ALL DEPARTMENTS DIRECTORY (HOD + TEACHERS UNDER EACH)       */}
        {/* ============================================================== */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-400" />
                <span>Academic Departments Roster</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Departmental breakdown displaying designated HOD, teaching faculty, student strength, and active lecture schedules.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Total Units: <strong className="text-white">{departmentsOverview.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {departmentsOverview.map((dept, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl glass-card border border-white/10 hover:border-purple-500/40 transition-all space-y-6"
              >
                {/* Department Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-white">{dept.name}</h3>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Attendance: {dept.attendanceRate}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                        <strong>{dept.studentCount}</strong> Enrolled Students
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                        <strong>{dept.teachers.length}</strong> Faculty Members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <strong>{dept.routinesCount}</strong> Routine Modules
                      </span>
                    </div>
                  </div>

                  {/* Actions for this department */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setOperatingAsDept(dept.name);
                        window.scrollTo({ top: 400, behavior: "smooth" });
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Command as HOD</span>
                    </button>
                    <button
                      onClick={() => handleExportAuditSheet(dept.name)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* HOD Card & Teachers Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* HOD Section */}
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        <span>Department Head (HOD)</span>
                      </div>
                      {dept.hod ? (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-500/20 border border-purple-400/40 shrink-0 relative">
                            {dept.hod.profilePicture ? (
                              <Image
                                src={dept.hod.profilePicture}
                                alt={dept.hod.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-purple-200 font-bold text-base">
                                {dept.hod.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-sm text-white truncate">{dept.hod.name}</h4>
                            <p className="text-xs text-purple-300 truncate">{dept.hod.designation || "Head of Department"}</p>
                            <p className="text-xs text-slate-400 truncate">{dept.hod.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-white/10 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-300">Vacant / Unassigned</p>
                          <p className="mt-1 text-[11px]">Direct Principal super-admin oversight active</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teachers Roster Under this Department */}
                  <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>Teaching Faculty ({dept.teachers.length})</span>
                      </span>
                      <span className="text-slate-400">Assigned Routine Load</span>
                    </div>

                    {dept.teachers.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/80 text-center text-xs text-slate-400">
                        No faculty registered under {dept.name} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                        {dept.teachers.map((t) => (
                          <div
                            key={t._id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-white/10 shrink-0 relative">
                                {t.profilePicture ? (
                                  <Image
                                    src={t.profilePicture}
                                    alt={t.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                                    {t.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate">{t.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{t.designation || "Faculty"}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                              {t.routinesCount} Classes
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. CAMPUS-WIDE STUDENT BIOMETRIC LEDGER & ID DIRECTORY          */}
        {/* ============================================================== */}
        <section className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-sky-400" />
                <span>All Enrolled Students & Biometric Registry</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Full student directory showing live attendance percentage, enrolled semester/section, and uploaded Digital ID Card soft copies.
              </p>
            </div>

            {/* Search & Department Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, roll, email..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 text-white text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 w-48 sm:w-64"
                />
              </div>

              <div className="relative">
                <select
                  value={studentDeptFilter}
                  onChange={(e) => setStudentDeptFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900/90 text-white text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {departmentsOverview.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-white/5 text-center text-xs text-slate-400">
              No registered students found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Roll Number</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Sem / Sec</th>
                    <th className="p-3.5">Turnout Rate</th>
                    <th className="p-3.5">Classes</th>
                    <th className="p-3.5 text-right">Digital ID Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((st) => {
                    const isDefaulter = st.attendancePercentage < 75;
                    return (
                      <tr key={st._id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-500/20 border border-purple-400/40 shrink-0 relative">
                            {st.profilePicture ? (
                              <Image
                                src={st.profilePicture}
                                alt={st.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-purple-300 text-xs">
                                {st.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white">{st.name}</p>
                            <p className="text-[11px] text-slate-400">{st.email}</p>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{st.rollNumber}</td>
                        <td className="p-3.5 text-slate-300">{st.department}</td>
                        <td className="p-3.5 text-slate-300">
                          Sem {st.semester} ({st.section})
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDefaulter
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {st.attendancePercentage}%
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {st.attendedClasses} / {st.totalClasses}
                        </td>
                        <td className="p-3.5 text-right">
                          {st.idCardSoftCopy ? (
                            <button
                              onClick={() => setPreviewIdCardUrl(st.idCardSoftCopy || null)}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold border border-sky-500/30 inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View ID Card</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Not Uploaded</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* At-Risk Students & Automated Disciplinary Warnings */}
        <AtRiskStudentsCard />

        {/* Broadcast Modal */}
        <BroadcastCircularModal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          authorRole="Principal"
          department="Executive Institutional Leadership"
        />

        {/* Student ID Card Preview Modal */}
        {previewIdCardUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative max-w-lg w-full p-6 rounded-3xl glass-card border border-white/20 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Digital Campus ID Card Preview</span>
                </h3>
                <button
                  onClick={() => setPreviewIdCardUrl(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
                <Image
                  src={previewIdCardUrl}
                  alt="Student Campus ID Card"
                  fill
                  className="object-contain"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setPreviewIdCardUrl(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
