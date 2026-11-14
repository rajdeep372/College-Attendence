"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  History, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  X
} from "lucide-react";

interface StudentMini {
  _id: string;
  name: string;
  roll: string;
  email: string;
}

export interface SessionHistoryItem {
  _id: string;
  date: string;
  timeSlot: string;
  subject: string;
  paperCode?: string;
  department: string;
  academicYear?: string;
  semester: number;
  section: string;
  teacherName: string;
  teacherId?: string;
  routineId?: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  turnoutPercentage: string;
  presentStudents: StudentMini[];
  absentStudents: StudentMini[];
}

interface ClassHistoryViewProps {
  teacherDepartment?: string;
  teacherId?: string;
  onRefreshNeeded?: () => void;
}

export function ClassHistoryView({
  teacherDepartment,
  teacherId,
}: ClassHistoryViewProps) {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(teacherDepartment || "all");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Download states for individual session or matrix
  const [downloadingDayId, setDownloadingDayId] = useState<string | null>(null);
  const [downloadingMatrixKey, setDownloadingMatrixKey] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== "all") {
        params.set("department", selectedDepartment);
      }
      if (selectedSemester && selectedSemester !== "all") {
        params.set("semester", selectedSemester);
      }
      if (selectedSection && selectedSection !== "all") {
        params.set("section", selectedSection);
      }
      if (selectedDate) {
        params.set("date", selectedDate);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (teacherId) {
        params.set("teacherId", teacherId);
      }

      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to load attendance history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDepartment, selectedSemester, selectedSection, selectedDate, searchQuery, teacherId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-Save sync: Listen for custom event whenever a teacher finishes marking attendance
  useEffect(() => {
    const handleAttendanceSubmitted = () => {
      fetchHistory();
    };

    window.addEventListener("attendance-submitted", handleAttendanceSubmitted);
    return () => {
      window.removeEventListener("attendance-submitted", handleAttendanceSubmitted);
    };
  }, [fetchHistory]);

  // Feature 2: Download Day Report (.xlsx) for a specific past session
  const handleDownloadDayReport = async (session: SessionHistoryItem) => {
    try {
      setDownloadingDayId(session._id);

      const params = new URLSearchParams({
        sessionId: session._id,
        mode: "day",
      });

      const res = await fetch(`/api/attendance/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export single-day report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const dateStr = session.date ? session.date.split("T")[0] : "Session";
      const cleanSub = (session.subject || "Subject").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${cleanSub}_${dateStr}_Day_Report.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading day report:", err);
      alert("Failed to download single-day report");
    } finally {
      setDownloadingDayId(null);
    }
  };

  // Feature 3: Download Full Semester Matrix (.xlsx)
  const handleDownloadSemesterMatrix = async (subject?: string, sem?: number, sec?: string, dept?: string) => {
    const key = `${subject || "All"}-${sem || "Sem"}-${sec || "Sec"}`;
    try {
      setDownloadingMatrixKey(key);

      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (sem) params.set("semester", sem.toString());
      if (sec && sec !== "all") params.set("section", sec);
      const targetDept = dept || (selectedDepartment !== "all" ? selectedDepartment : teacherDepartment);
      if (targetDept && targetDept !== "all") params.set("department", targetDept);

      const res = await fetch(`/api/attendance/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export semester matrix");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const cleanSub = (subject || targetDept || "Class").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${cleanSub}_Semester_Attendance_Matrix.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading semester matrix:", err);
      alert("Failed to download semester attendance matrix");
    } finally {
      setDownloadingMatrixKey(null);
    }
  };

  // Format display date
  const formatDisplayDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "Unknown Date";
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl glass-card border border-sky-500/30 bg-slate-900/90 shadow-[0_15px_40px_rgba(2,132,199,0.15)] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <History className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Class Attendance History & Registry
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Automated archive of all past attendance sessions. Filter by date, search subjects, or export daily ledgers and semester master matrices.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleDownloadSemesterMatrix()}
              disabled={Boolean(downloadingMatrixKey)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-50"
              title="Download Date-Wise Master Matrix for Current Filter"
            >
              {downloadingMatrixKey ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Matrix...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Download Full Semester Matrix</span>
                </>
              )}
            </button>

            <button
              onClick={fetchHistory}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-all cursor-pointer"
              title="Reload History"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls: Date-Picker, Search Bar, Semester, Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 text-xs">
          {/* Search Bar */}
          <div className="relative">
            <label className="block text-slate-400 font-medium mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search subject, section, slot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Filter by Exact Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  title="Clear date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="all">All Sections</option>
              {["Section A", "Section B", "Section C", "Section D"].map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Cards List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center rounded-3xl glass-card border border-white/10 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-white">Loading Class Attendance History...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching recorded sessions from MongoDB</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center rounded-3xl glass-card border border-white/10 flex flex-col items-center justify-center">
            <History className="w-10 h-10 text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-white mb-1">No Past Attendance Records Found</h4>
            <p className="text-xs text-slate-400 max-w-md">
              {selectedDate || searchQuery
                ? "No sessions match your search or date filter. Try clearing filters to view all past records."
                : "No attendance sessions have been submitted yet. When you finish marking attendance, records will auto-save here."}
            </p>
          </div>
        ) : (
          history.map((session) => {
            const isExpanded = expandedSessionId === session._id;

            return (
              <div
                key={session._id}
                className="p-5 sm:p-6 rounded-2xl glass-card border border-white/10 bg-slate-900/70 hover:border-sky-500/30 transition-all space-y-4 shadow-sm"
              >
                {/* Session Card Top Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Subject & Timing */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-sky-950/80 text-sky-400 border border-sky-800">
                        {session.paperCode || "COURSE"}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {session.subject}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/20">
                        Sem {session.semester} &bull; {session.section}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>{formatDisplayDate(session.date)}</span>
                      </div>
                      <span>&bull;</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{session.timeSlot}</span>
                      </div>
                      <span>&bull;</span>
                      <span className="text-slate-400">{session.department}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400 font-medium">By: {session.teacherName}</span>
                    </div>
                  </div>

                  {/* Turnout Badges & Export Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Turnout Pill */}
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center gap-3 text-xs font-mono">
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{session.presentCount}</span>
                      </div>
                      <span className="text-slate-600">/</span>
                      <div className="flex items-center gap-1 text-rose-400 font-bold">
                        <UserX className="w-3.5 h-3.5" />
                        <span>{session.absentCount}</span>
                      </div>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-sky-300 font-bold">{session.turnoutPercentage}</span>
                    </div>

                    {/* Feature 2: Download Day Report Button */}
                    <button
                      onClick={() => handleDownloadDayReport(session)}
                      disabled={downloadingDayId === session._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      title="Download single-day attendance sheet (Roll No, Name, Status)"
                    >
                      {downloadingDayId === session._id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Exporting Day...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Download Day Report</span>
                        </>
                      )}
                    </button>

                    {/* Feature 3: Download Semester Matrix for this Subject */}
                    <button
                      onClick={() =>
                        handleDownloadSemesterMatrix(
                          session.subject,
                          session.semester,
                          session.section,
                          session.department
                        )
                      }
                      disabled={Boolean(downloadingMatrixKey)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      title="Download date-wise semester matrix for this subject"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Semester Matrix</span>
                    </button>

                    {/* Expand/Collapse Roster Details */}
                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session._id)
                      }
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title={isExpanded ? "Collapse attendees list" : "Expand attendees list"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Student Roll View */}
                {isExpanded && (
                  <div className="pt-4 mt-2 border-t border-white/10 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Present Students */}
                      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-500/20">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Present Students ({session.presentStudents.length})
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {session.presentStudents.length === 0 ? (
                            <span className="text-slate-400 italic">No students marked present.</span>
                          ) : (
                            session.presentStudents.map((st) => (
                              <div
                                key={st._id || st.roll}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60"
                              >
                                <span className="text-white font-medium">{st.name}</span>
                                <span className="text-emerald-300 font-mono text-[11px]">{st.roll}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Absent Students */}
                      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/20">
                          <span className="font-bold text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            Absent Students ({session.absentStudents.length})
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {session.absentStudents.length === 0 ? (
                            <span className="text-slate-400 italic">No absent students recorded (100% turnout!).</span>
                          ) : (
                            session.absentStudents.map((st) => (
                              <div
                                key={st._id || st.roll}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60"
                              >
                                <span className="text-white font-medium">{st.name}</span>
                                <span className="text-rose-300 font-mono text-[11px]">{st.roll}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
