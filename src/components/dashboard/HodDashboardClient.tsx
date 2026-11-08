"use client";

import React, { useState, useEffect } from "react";
import { SerializedUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { RoutineUploadDropzone } from "@/components/routine/RoutineUploadDropzone";
import { AtRiskStudentsCard } from "@/components/dashboard/AtRiskStudentsCard";
import { BroadcastCircularModal } from "@/components/modals/BroadcastCircularModal";
import { DepartmentRoutineModal } from "@/components/modals/DepartmentRoutineModal";
import { 
  Award, 
  Users, 
  Clock, 
  FileCheck, 
  BookMarked, 
  UserCheck, 
  CalendarCheck, 
  Sparkles,
  Download,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Megaphone,
  Calendar
} from "lucide-react";

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
    name?: string;
    email?: string;
    rollNumber?: string;
  };
}

interface HodAnalytics {
  stats: Array<{
    label: string;
    value: string;
    sub: string;
    color: string;
  }>;
  pendingLeaves: PendingLeaveItem[];
  studentCount: number;
  facultyCount: number;
  routineCount: number;
}

export function HodDashboardClient({ user }: { user: SerializedUser | null }) {
  const [analytics, setAnalytics] = useState<HodAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCircularModalOpen, setIsCircularModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);

  const fetchHodAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: "HOD",
        department: user?.department || "Computer Science & Engineering",
      });
      const res = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Error fetching HOD analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHodAnalytics();
  }, [user]);

  // Handle Sanction or Reject leave
  const handleLeaveDecision = async (leaveId: string, status: "Approved" | "Rejected") => {
    setActionInProgress(leaveId);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status,
          decisionNotes: `Sanctioned by Department HOD (${user?.name || "HOD Office"})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update leave status");
      }

      setStatusMessage(`Leave request marked as ${status}.`);
      fetchHodAnalytics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating leave.";
      setStatusMessage(`Failed: ${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Download Attendance CSV
  const handleDownloadCsv = () => {
    const dept = encodeURIComponent(user?.department || "Computer Science");
    window.location.href = `/api/attendance/export?department=${dept}`;
  };

  const statIcons = [UserCheck, Users, Clock, FileCheck];

  const defaultStats = [
    { label: "Branch Attendance", value: "96.4%", sub: user?.department || "Computer Science Dept", color: "from-blue-500 to-indigo-600" },
    { label: "Active Faculty Today", value: "24 / 25", sub: "1 on Medical Leave", color: "from-cyan-500 to-blue-600" },
    { label: "Classes Scheduled", value: "38 Sessions", sub: "Active Timetable Modules", color: "from-emerald-500 to-teal-600" },
    { label: "Pending Leave Requests", value: `${analytics?.pendingLeaves?.length || 0}`, sub: "Requires HOD Sanction", color: "from-amber-500 to-orange-600" },
  ];

  const displayStats = analytics?.stats || defaultStats;
  const pendingLeaves = analytics?.pendingLeaves || [];

  return (
    <RoleGuard allowedRole="HOD" user={user}>
      <div className="space-y-8 animate-fade-in relative">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={user} defaultRole="HOD" />

        {/* Welcome Banner */}
        <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-blue-500/30 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Department Administration & Academic Command</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Department Operations & Faculty Schedule Oversight
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                Supervise branch lecture conduction, faculty allotments, student leave sanctions, and course syllabus velocity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRoutineModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-100 text-sky-700 border border-sky-300/80 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-sky-300 dark:border-sky-500/30 shadow-sm transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Review Timetable Schedule</span>
              </button>

              <button
                onClick={() => setIsCircularModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Post Department Notice</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Attendance CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="p-3 rounded-2xl bg-white border border-sky-300 text-sky-800 dark:bg-slate-900 dark:border-sky-500/40 dark:text-sky-300 text-xs flex items-center justify-between shadow-sm">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayStats.map((stat, i) => {
            const Icon = statIcons[i % statIcons.length];
            return (
              <div
                key={i}
                className="p-5 rounded-2xl glass-card glass-card-interactive border border-slate-200/80 dark:border-white/10 hover:border-blue-400/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${stat.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-2 text-xs text-sky-600 dark:text-sky-400 font-medium truncate">
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Routine Upload & Sync Station */}
        <RoutineUploadDropzone defaultDepartment={user?.department || "Computer Science"} />

        {/* At-Risk Students & Automated Disciplinary Warnings */}
        <AtRiskStudentsCard department={user?.department} />

        {/* Pending Approvals & Syllabus Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="leaves" className="lg:col-span-2 p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pending Leave Authorizations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Student medical leaves and official on-duty approvals from live MongoDB</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchHodAnalytics}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sky-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-sky-400 transition-all cursor-pointer"
                  title="Refresh Leaves"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                  {pendingLeaves.length} Requiring Action
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.map((leave) => {
                  const applicant = leave.applicantId;
                  const roll = applicant?.rollNumber || "2023-CS-000";
                  const startStr = new Date(leave.startDate).toLocaleDateString();
                  const endStr = new Date(leave.endDate).toLocaleDateString();

                  return (
                    <div
                      key={leave._id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-900/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {leave.applicantName || applicant?.name || "Student"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {roll} &bull; <span className="text-sky-700 dark:text-sky-300 font-medium">{leave.leaveType}</span> ({startStr} &rarr; {endStr})
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">&ldquo;{leave.reason}&rdquo;</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          disabled={actionInProgress === leave._id}
                          onClick={() => handleLeaveDecision(leave._id, "Approved")}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Sanction</span>
                        </button>
                        <button
                          disabled={actionInProgress === leave._id}
                          onClick={() => handleLeaveDecision(leave._id, "Rejected")}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-rose-950 dark:text-slate-300 dark:hover:text-rose-300 dark:border-white/10 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 text-center">
                  All student and faculty leave applications in this department have been processed.
                </div>
              )}
            </div>
          </div>

          {/* Department Accreditation & Export */}
          <div className="p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookMarked className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Department Compliance</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Biometric Ledger Consistency</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold">98.4%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: "98.4%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Geofence Radius Integrity</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold">100% verified</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Faculty Registry Complete</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {analytics?.facultyCount || 0} Active Instructors
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "95%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={handleDownloadCsv}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 dark:bg-blue-600/30 dark:hover:bg-blue-600/50 dark:border-blue-500/30 dark:text-blue-300 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Branch Accreditation Audit CSV &rarr;</span>
              </button>
            </div>
          </div>
        </div>

        {/* Circular Modal */}
        <BroadcastCircularModal
          isOpen={isCircularModalOpen}
          onClose={() => setIsCircularModalOpen(false)}
          authorRole="HOD"
          department={user?.department || "Computer Science & Engineering"}
        />

        {/* Department Timetable Routine Modal */}
        <DepartmentRoutineModal
          isOpen={isRoutineModalOpen}
          onClose={() => setIsRoutineModalOpen(false)}
          department={user?.department || "Computer Science & Engineering"}
        />
      </div>
    </RoleGuard>
  );
}

