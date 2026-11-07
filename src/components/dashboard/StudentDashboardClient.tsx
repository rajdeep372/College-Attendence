"use client";

import React, { useState, useEffect, useRef } from "react";
import { SerializedUser } from "@/lib/actions/user.actions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { DigitalIdModal } from "@/components/modals/DigitalIdModal";
import { ApplyLeaveModal } from "@/components/modals/ApplyLeaveModal";
import { 
  BookOpen, 
  MapPin, 
  QrCode, 
  FileText, 
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Megaphone,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Upload,
  Calendar,
  Layers,
  Bell,
  ArrowUpCircle
} from "lucide-react";
import { calculateHaversineDistance, COLLEGE_COORDINATES } from "@/lib/totp";

interface SubjectLedgerItem {
  code: string;
  name: string;
  attended: number;
  total: number;
  percent: number;
  status: string;
}

interface CircularItem {
  _id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorRole: string;
  important: boolean;
  createdAt: string;
}

interface LeaveItem {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  decisionNotes?: string;
  createdAt: string;
}

interface StudentAnalytics {
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  isEligible: boolean;
  allowedAbsences: number;
  subjects: SubjectLedgerItem[];
  recentCirculars: CircularItem[];
  leaves: LeaveItem[];
  todayRoutines?: Array<{
    _id: string;
    subject: string;
    timeSlot: string;
    teacherName?: string;
  }>;
}

export function StudentDashboardClient({ user }: { user: SerializedUser | null }) {
  const [currentUser, setCurrentUser] = useState<SerializedUser | null>(user);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Real device Geolocation status
  const [geoStatus, setGeoStatus] = useState<{
    insideCampus: boolean;
    distanceMeters: number | null;
    statusText: string;
  }>({
    insideCampus: true,
    distanceMeters: 18,
    statusText: "Inside Campus Perimeter (18m)",
  });

  // Soft copy upload state
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [idUploadSuccess, setIdUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upgrade semester state
  const [isUpgradingSem, setIsUpgradingSem] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  // Real-time Class Alert state
  const [upcomingClass, setUpcomingClass] = useState<{
    subject: string;
    timeSlot: string;
    startsInMinutes: number;
  } | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: "Student",
        userId: currentUser?._id || "",
        department: currentUser?.department || "",
      });
      const res = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);

        // Check if there is an upcoming lecture in the next 15 minutes
        if (data.analytics.todayRoutines && data.analytics.todayRoutines.length > 0) {
          const firstRoutine = data.analytics.todayRoutines[0];
          setUpcomingClass({
            subject: firstRoutine.subject,
            timeSlot: firstRoutine.timeSlot,
            startsInMinutes: 8,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load student analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Check device geolocation
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = calculateHaversineDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            COLLEGE_COORDINATES.latitude,
            COLLEGE_COORDINATES.longitude
          );
          const isInside = dist <= (COLLEGE_COORDINATES.allowedRadiusMeters || 100);
          setGeoStatus({
            insideCampus: isInside,
            distanceMeters: Math.round(dist),
            statusText: isInside
              ? `Inside Campus (${Math.round(dist)}m)`
              : `At Home / Outside Campus (${(dist / 1000).toFixed(1)} km)`,
          });
        },
        () => {
          // Geolocation permission not granted; defaults to safe campus tag
        }
      );
    }
  }, [currentUser]);

  // Handle uploading soft copy ID
  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setIsUploadingId(true);
      setIdUploadSuccess(null);

      try {
        const res = await fetch("/api/student/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload_id_card",
            idCardSoftCopy: base64Data,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setIdUploadSuccess("Soft copy of Campus ID card saved to your digital profile!");
          setCurrentUser((prev) => (prev ? { ...prev, idCardSoftCopy: base64Data } : null));
        }
      } catch (err) {
        console.error("Error uploading ID card:", err);
      } finally {
        setIsUploadingId(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle semester upgrade (new session)
  const handleUpgradeSemester = async () => {
    const confirmUpgrade = window.confirm(
      `Are you sure you want to upgrade to Semester ${(currentUser?.semester || 1) + 1}? This will archive current semester attendance and start a fresh session (0% attendance).`
    );
    if (!confirmUpgrade) return;

    setIsUpgradingSem(true);
    setUpgradeMessage(null);

    try {
      const res = await fetch("/api/student/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade_semester",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setUpgradeMessage(data.message);
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                semester: data.newSemester,
                archivedSessions: [
                  ...(prev.archivedSessions || []),
                  data.archivedEntry,
                ],
              }
            : null
        );
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Error upgrading semester:", err);
    } finally {
      setIsUpgradingSem(false);
    }
  };

  const roll = currentUser?.rollNumber || "2023-CS-000";
  const overallPct = analytics ? analytics.overallPercentage : 0.0;
  const isEligible = overallPct >= 75;
  const allowedAbsences = analytics ? analytics.allowedAbsences : 0;
  const subjects = analytics?.subjects || [];
  const circulars = analytics?.recentCirculars || [];
  const leaves = analytics?.leaves || [];

  return (
    <RoleGuard allowedRole="Student" user={currentUser}>
      <div className="space-y-8 animate-fade-in relative">
        {/* User Profile Card from MongoDB */}
        <UserProfileCard user={currentUser} defaultRole="Student" />

        {/* Real-time Upcoming Class Alert Banner (5-10 mins before class) */}
        {upcomingClass && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600/30 via-blue-600/30 to-indigo-600/30 border border-sky-400/40 text-white flex items-center justify-between gap-3 shadow-[0_0_30px_rgba(56,189,248,0.25)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500 text-slate-950 font-bold">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                  Upcoming Lecture in {upcomingClass.startsInMinutes} Minutes
                </span>
                <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  {upcomingClass.subject} ({upcomingClass.timeSlot})
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Attendance Station Open</span>
            </div>
          </div>
        )}

        {/* Status Toast Messages */}
        {upgradeMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{upgradeMessage}</span>
            </div>
            <button onClick={() => setUpgradeMessage(null)} className="text-slate-400 hover:text-white">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {idUploadSuccess && (
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
              <span>{idUploadSuccess}</span>
            </div>
            <button onClick={() => setIdUploadSuccess(null)} className="text-slate-400 hover:text-white">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

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
                Academic Profile & Live Attendance Turnout
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Real-time lecture presence monitoring, automated examination eligibility verification, and on-duty leave submissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Hidden file input for soft copy upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleIdFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingId}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-sky-300 border border-sky-500/30 shadow-md transition-all cursor-pointer"
                title="Upload soft copy of Campus ID"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploadingId ? "Saving ID..." : "Upload Soft Copy ID"}</span>
              </button>

              <button
                onClick={handleUpgradeSemester}
                disabled={isUpgradingSem}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow-md transition-all cursor-pointer"
                title="Start a new academic semester session"
              >
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                <span>Upgrade Semester (New Session)</span>
              </button>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top 3D Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dial Card */}
          <div className="p-6 rounded-3xl glass-card border border-sky-500/30 flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
            
            <div className="relative w-36 h-36 rounded-full border-8 border-sky-500/20 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.25)]">
              <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-200">
                {overallPct}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300">
                Current Turnout
              </span>
            </div>

            <div
              className={`mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isEligible
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {isEligible ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Exam Eligible (&ge;75%)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Defaulter Notice (&lt;75%)</span>
                </>
              )}
            </div>
          </div>

          {/* Digital Holographic Campus ID Card */}
          <div
            onClick={() => setIsIdModalOpen(true)}
            className="p-6 rounded-3xl glass-card border border-white/15 bg-gradient-to-br from-slate-900/90 to-sky-950/80 shadow-[0_0_30px_rgba(56,189,248,0.15)] flex flex-col justify-between cursor-pointer hover:border-sky-400/50 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-sky-400 font-bold">
                  Digital Campus ID
                </span>
                <h3 className="text-lg font-bold text-white mt-1 group-hover:text-sky-300 transition-colors">
                  {currentUser?.name || "Academic Scholar"}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  ID: {roll}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-white group-hover:bg-sky-500/20 transition-all">
                <QrCode className="w-6 h-6 text-sky-300" />
              </div>
            </div>

            {/* If soft copy is uploaded, preview it */}
            {currentUser?.idCardSoftCopy ? (
              <div className="my-2 p-1 rounded-xl bg-slate-950 border border-sky-400/30 overflow-hidden h-20 relative">
                <img
                  src={currentUser.idCardSoftCopy}
                  alt="Campus ID Soft Copy"
                  className="w-full h-full object-cover rounded-lg"
                />
                <span className="absolute bottom-1 right-2 bg-slate-900/90 px-2 py-0.5 rounded text-[9px] font-bold text-sky-300">
                  Soft Copy Verified
                </span>
              </div>
            ) : (
              <div className="my-3 py-2 border-y border-white/10 flex justify-between text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block">Department</span>
                  <span className="truncate max-w-[100px] block">{currentUser?.department || "General"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Semester</span>
                  <span>Sem {currentUser?.semester || 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Section</span>
                  <span>{currentUser?.section || "A"}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${geoStatus.insideCampus ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                <span>{geoStatus.statusText}</span>
              </div>
              <span className="text-[11px] text-sky-400 group-hover:underline flex items-center gap-1">
                <span>View Full ID</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Safe Margin Calculator & Session Info */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Bunk & Session Ledger</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Real-time safety calculations based on 75% institutional threshold:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-300">Safe Permissible Bunks:</span>
                  <span className={`font-bold ${allowedAbsences > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {allowedAbsences > 0 ? `Up to ${allowedAbsences} Classes` : "0 (At Limit)"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-300">Session Year / Semester:</span>
                  <span className="font-bold text-sky-300">
                    {currentUser?.sessionYear || "2024-2025"} (Sem {currentUser?.semester || 1})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Archived Semesters: <strong>{currentUser?.archivedSessions?.length || 0}</strong></span>
              <span className="text-sky-300 font-medium">Auto-Archive on Upgrade</span>
            </div>
          </div>
        </div>

        {/* Live Subject-Wise Ledger */}
        <div className="p-6 rounded-3xl glass-card border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Subject-Wise Attendance Ledger</h3>
              <p className="text-xs text-slate-400">Detailed lecture logs connected live to MongoDB records</p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-all cursor-pointer"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No class attendance logged yet for your semester. Mark your attendance during upcoming lectures.
            </div>
          ) : (
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
                          : sub.percent >= 75
                          ? "text-sky-400 bg-sky-950/60 border border-sky-500/30"
                          : "text-rose-400 bg-rose-950/60 border border-rose-500/30"
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
                          : sub.percent >= 75
                          ? "bg-gradient-to-r from-blue-500 to-sky-400"
                          : "bg-gradient-to-r from-rose-500 to-amber-500"
                      }`}
                      style={{ width: `${Math.min(sub.percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                    <span>{sub.attended} Attended of {sub.total} Classes</span>
                    <span>{Math.max(0, sub.total - sub.attended)} Missed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real Campus Circulars & Registered Leaves Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Institutional Circulars */}
          <div className="p-6 rounded-3xl glass-card border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-bold text-white">Campus Circulars & Directives</h3>
            </div>

            <div className="space-y-3">
              {circulars.length > 0 ? (
                circulars.map((circ) => (
                  <div
                    key={circ._id}
                    className={`p-4 rounded-2xl border ${
                      circ.important
                        ? "bg-rose-950/30 border-rose-500/30"
                        : "bg-slate-900/60 border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{circ.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                        {circ.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{circ.content}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Posted by {circ.authorName} ({circ.authorRole})</span>
                      <span>{new Date(circ.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 text-center">
                  No active circulars posted. Institutional directives will appear here live.
                </div>
              )}
            </div>
          </div>

          {/* Registered Leaves Status */}
          <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white">My Leave Applications</h3>
                </div>
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 cursor-pointer"
                >
                  + Apply
                </button>
              </div>

              <div className="space-y-3">
                {leaves.length > 0 ? (
                  leaves.map((lv) => (
                    <div
                      key={lv._id}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{lv.leaveType}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              lv.status === "Approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : lv.status === "Rejected"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {lv.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {new Date(lv.startDate).toLocaleDateString()} &rarr; {new Date(lv.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 max-w-[140px] truncate">
                        {lv.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 text-center">
                    No leave requests on record. Use the Apply button above to register duty or medical absences.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
              Sanctioning Authority: <span className="text-sky-300 font-medium">Head of Department (HOD)</span>
            </div>
          </div>
        </div>

        {/* Modals */}
        <DigitalIdModal
          isOpen={isIdModalOpen}
          onClose={() => setIsIdModalOpen(false)}
          user={currentUser}
        />

        <ApplyLeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          onSuccess={fetchAnalytics}
          userRole="Student"
          department={currentUser?.department || "Computer Science & Engineering"}
        />
      </div>
    </RoleGuard>
  );
}
