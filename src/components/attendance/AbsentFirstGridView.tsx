"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Send, 
  RefreshCw, 
  Sparkles, 
  FileSpreadsheet,
  Search,
  BookOpen,
  Building,
  GraduationCap,
  BellRing,
  Download,
  Layers,
  X
} from "lucide-react";

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  roll: string;
  department: string;
  academicYear?: string;
  semester?: number;
  section?: string;
  profilePicture: string;
}

interface RoutineDetails {
  _id: string;
  subject: string;
  department: string;
  academicYear?: string;
  semester: number;
  section?: string;
  timeSlot: string;
  dayOfWeek: string;
}

interface AvailableClass {
  routineId: string;
  classId?: string;
  subject: string;
  paperCode: string;
  timeSlot: string;
  department: string;
  academicYear: string;
  semester: number;
  section: string;
}

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Machine Learning",
  "Bachelor of Computer Applications (BCA)",
  "Master of Computer Applications (MCA)",
  "Electrical & Electronics Engineering (EEE)",
  "Electronics & Communication Engineering (ECE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Data Science",
  "Cyber Security",
  "General Academic & Sciences",
];

const ACADEMIC_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["Section A", "Section B", "Section C", "Section D"];

export function AbsentFirstGridView() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [routine, setRoutine] = useState<RoutineDetails | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Faculty Instructor");

  // 4 Strict Parameters + Session Details
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [academicYear, setAcademicYear] = useState("3rd Year");
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("Section A");
  const [subjectName, setSubjectName] = useState("Distributed Cloud Systems");
  const [timeSlot, setTimeSlot] = useState("11:30 AM - 12:30 PM");
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);

  // Set of student IDs marked ABSENT
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    presentCount: number;
    absentCount: number;
    notificationsSent: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync Semester -> Academic Year
  const handleSemesterChange = (newSem: number) => {
    setSemester(newSem);
    let derivedYear = "1st Year";
    if (newSem >= 3 && newSem <= 4) derivedYear = "2nd Year";
    else if (newSem >= 5 && newSem <= 6) derivedYear = "3rd Year";
    else if (newSem >= 7 && newSem <= 8) derivedYear = "4th Year";
    setAcademicYear(derivedYear);
    fetchClassRoster(department, derivedYear, newSem, section);
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    fetchClassRoster(newDept, academicYear, semester, section);
  };

  const handleAcademicYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    fetchClassRoster(department, newYear, semester, section);
  };

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    fetchClassRoster(department, academicYear, semester, newSection);
  };

  const fetchClassRoster = async (
    targetDept = department,
    targetYear = academicYear,
    targetSem = semester,
    targetSec = section
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        department: targetDept,
        academicYear: targetYear,
        semester: targetSem.toString(),
        section: targetSec,
      });

      const res = await fetch(`/api/attendance/today?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load class roster");
      }
      setStudents(data.students || []);
      if (data.availableClasses) {
        setAvailableClasses(data.availableClasses);
        if (data.availableClasses.length > 0) {
          const matching =
            data.availableClasses.find(
              (c: AvailableClass) => c.semester === targetSem && c.section === targetSec
            ) || data.availableClasses[0];

          setSubjectName(matching.subject);
          setTimeSlot(matching.timeSlot);
        } else {
          setSubjectName("");
          setTimeSlot("");
        }
      }
      if (data.routine) {
        setRoutine(data.routine);
        if (!data.availableClasses || data.availableClasses.length === 0) {
          if (data.routine.subject) setSubjectName(data.routine.subject);
          if (data.routine.timeSlot) setTimeSlot(data.routine.timeSlot);
        }
      }
      if (data.teacher?._id) setTeacherId(data.teacher._id);
      if (data.teacher?.name) setTeacherName(data.teacher.name);
      setAbsentIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching roster";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassRoster();
  }, []);

  // Toggle single student: Present <-> Absent
  const toggleStudentStatus = (studentId: string) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId); // Mark Present
      } else {
        next.add(studentId); // Mark Absent
      }
      return next;
    });
  };

  const markAllPresent = () => {
    setAbsentIds(new Set());
  };

  // Submit attendance to MongoDB with full 4-parameter academic hierarchy metadata
  const handleSubmitAttendance = async () => {
    if (students.length === 0) {
      setError("No students found in this cohort to mark attendance.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmissionSuccess(null);

    const absentArray = Array.from(absentIds);
    const presentArray = students
      .filter((s) => !absentIds.has(s._id))
      .map((s) => s._id);

    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineId: routine?._id || undefined,
          subject: subjectName,
          timeSlot,
          teacherName,
          department,
          academicYear,
          semester,
          section,
          presentStudents: presentArray,
          absentStudents: absentArray,
          markedBy: teacherId,
          date: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit attendance to MongoDB");
      }

      setSubmissionSuccess({
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        notificationsSent: data.notificationsSent || 0,
        message: data.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting attendance";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Excel (.xlsx) matrix report filtered strictly by the 4 academic hierarchy parameters
  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        department,
        academicYear,
        semester: semester.toString(),
        section,
      });
      const res = await fetch(`/api/export/attendance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export Excel report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanDept = (department || "Attendance").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${cleanDept}_Sem${semester}_Attendance_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.location.href = `/api/attendance/export?department=${encodeURIComponent(department)}&semester=${semester}&section=${encodeURIComponent(section)}`;
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.roll && s.roll.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  const presentCount = students.length - absentIds.size;
  const absentCount = absentIds.size;

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl glass-card border border-sky-500/30 shadow-[0_15px_40px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Background Neon Accent */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <UserCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Class Attendance & Absent-First Roster
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Strict 4-parameter cohort isolation: <span className="text-sky-300 font-semibold">{department} &bull; {academicYear} &bull; Sem {semester} &bull; {section}</span>. Click any student card to mark them <strong className="text-rose-400">Absent</strong>.
          </p>
        </div>

        {/* Quick Actions & Excel Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 shadow-sm transition-all cursor-pointer"
            title="Download Excel Sheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => fetchClassRoster()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-all cursor-pointer"
            title="Reload Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={markAllPresent}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all cursor-pointer"
          >
            Reset All to Present
          </button>
        </div>
      </div>

      {/* 4-Parameter Session Metadata Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-white/10 mb-6 text-xs">
        {/* 1. Department */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-sky-400 cursor-pointer truncate"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 2. Academic Year */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => handleAcademicYearChange(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {ACADEMIC_YEARS.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        {/* 3. Semester */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Semester</label>
          <select
            value={semester}
            onChange={(e) => handleSemesterChange(Number(e.target.value))}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        {/* 4. Section (CRITICAL) */}
        <div>
          <label className="block text-amber-400 font-bold mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Section</span>
          </label>
          <select
            value={section}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec} className="bg-slate-900 text-white">{sec}</option>
            ))}
          </select>
        </div>

        {/* 5. Subject Dropdown (Fetched from MongoDB Routine collection) */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Class / Subject</label>
          <select
            value={subjectName}
            onChange={(e) => {
              const selectedSubject = e.target.value;
              setSubjectName(selectedSubject);
              const matched = availableClasses.find((c) => c.subject === selectedSubject);
              if (matched) {
                setTimeSlot(matched.timeSlot);
                if (matched.semester !== semester || matched.section !== section) {
                  setSemester(matched.semester);
                  setSection(matched.section);
                  setAcademicYear(matched.academicYear || academicYear);
                  fetchClassRoster(matched.department, matched.academicYear || academicYear, matched.semester, matched.section);
                }
              }
            }}
            disabled={availableClasses.length === 0}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-sky-400 cursor-pointer disabled:opacity-50"
          >
            {availableClasses.length === 0 ? (
              <option value="">No scheduled subjects today</option>
            ) : (
              Array.from(new Set(availableClasses.map((c) => c.subject))).map((sub) => {
                const item = availableClasses.find((c) => c.subject === sub);
                return (
                  <option key={sub} value={sub} className="bg-slate-900 text-white">
                    {sub} {item?.paperCode ? `(${item.paperCode})` : ""}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {/* 6. Time Slot Dropdown (Fetched from MongoDB Routine collection) */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Time Slot</label>
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            disabled={availableClasses.length === 0}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-sky-400 cursor-pointer disabled:opacity-50"
          >
            {availableClasses.length === 0 ? (
              <option value="">No scheduled slots today</option>
            ) : (
              Array.from(
                new Set(
                  availableClasses
                    .filter((c) => !subjectName || c.subject === subjectName)
                    .map((c) => c.timeSlot)
                    .concat(availableClasses.map((c) => c.timeSlot))
                    .filter(Boolean)
                )
              ).map((slot) => (
                <option key={slot} value={slot} className="bg-slate-900 text-white">
                  {slot}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Interactive Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
        <input
          type="text"
          placeholder="Search student by name, roll number (e.g. 2023, CSE-042), or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/30 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Feedback Messages */}
      {submissionSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{submissionSuccess.message}</span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-300">
            {submissionSuccess.notificationsSent} Student Alerts Dispatched
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Turnout Counters Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 mb-6 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <UserCheck className="w-4 h-4" />
            <span>{presentCount} Present</span>
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-400">
            <UserX className="w-4 h-4" />
            <span>{absentCount} Marked Absent</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 font-semibold">
            {section}
          </span>
          <span>
            Total Cohort: <strong className="text-white">{students.length}</strong>
          </span>
        </div>
      </div>

      {/* Student Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <span>Loading student class roster for {section}...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs p-6 rounded-2xl bg-slate-950/60 border border-white/5">
          {searchQuery ? (
            <span>No student matched &quot;{searchQuery}&quot;. Clear search to view all enrolled scholars.</span>
          ) : (
            <span>No registered students found for <strong>{department} &bull; Sem {semester} &bull; {section}</strong>. Have students select this exact section in their onboarding form to populate this roster.</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredStudents.map((st) => {
            const isAbsent = absentIds.has(st._id);

            return (
              <motion.div
                key={st._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleStudentStatus(st._id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
                  isAbsent
                    ? "bg-rose-950/50 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    : "bg-slate-900/70 border-white/10 hover:border-sky-400/50"
                }`}
              >
                {/* Status Stamp */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isAbsent
                        ? "bg-rose-500 text-white shadow"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {isAbsent ? "ABSENT" : "PRESENT"}
                  </span>

                  <span className="font-mono text-[11px] font-bold text-sky-300">
                    {st.roll || "NO ROLL"}
                  </span>
                </div>

                {/* Avatar and Name */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden text-sm">
                    {st.profilePicture ? (
                      <img src={st.profilePicture} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      st.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{st.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{st.email}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 font-mono text-sky-300">
                        {st.section || section}
                      </span>
                      <span>&bull; Sem {st.semester || semester}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tap to mark {isAbsent ? "Present" : "Absent"}</span>
                  {isAbsent && <UserX className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Submission CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
        <div className="text-xs text-slate-400">
          Target: <strong className="text-white">{department}</strong> &bull; <strong className="text-amber-300">{section}</strong> &bull; Sem <strong className="text-sky-300">{semester}</strong>
        </div>

        <button
          onClick={handleSubmitAttendance}
          disabled={isSubmitting || students.length === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving to MongoDB & Sending Alerts...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Attendance & Push Student Alerts</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
