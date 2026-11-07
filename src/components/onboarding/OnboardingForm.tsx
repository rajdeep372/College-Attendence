"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GraduationCap, 
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  School,
  Hash,
  Layers,
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle
} from "lucide-react";
import { 
  isPersonalEmail, 
  isPrincipalSuperAdmin, 
  STRICT_SSO_ERROR_MESSAGE 
} from "@/lib/auth-rbac";

export const DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Bachelor of Computer Applications (BCA)",
  "Master of Computer Applications (MCA)",
  "Electrical & Electronics Engineering (EEE)",
  "Electronics & Communication Engineering (ECE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Data Science & Analytics",
  "Cyber Security & Forensics",
  "Office of the Principal & Institutional Affairs",
  "General Academic & Sciences",
];

export const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export const SECTIONS = [
  "Section A",
  "Section B",
  "Section C",
  "Section D",
];

export const BATCH_OPTIONS = [
  "2024-2028",
  "2023-2027",
  "2022-2026",
  "2021-2025",
  "2025-2029",
];

const DESIGNATIONS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Head of Department (HOD)",
  "Senior Lecturer",
  "Dean of Academic Affairs",
];

interface OnboardingFormProps {
  initialEmail: string;
  initialName?: string;
  initialRole?: "Student" | "Teacher" | "HOD" | "Principal";
  initialDepartment?: string;
  initialRoll?: string;
}

interface UnclaimedProfile {
  teacherName: string;
  classCount: number;
  subjects: string[];
}

export function OnboardingForm({
  initialEmail,
  initialName = "",
  initialRole,
  initialDepartment = "Computer Science & Engineering (CSE)",
  initialRoll = "",
}: OnboardingFormProps) {
  const router = useRouter();

  const isPersonal = isPersonalEmail(initialEmail) && !isPrincipalSuperAdmin(initialEmail);
  const defaultRole: "Student" | "Teacher" | "HOD" | "Principal" =
    initialRole || (isPersonal ? "Principal" : "Student");

  const [role, setRole] = useState<"Student" | "Teacher" | "HOD" | "Principal">(defaultRole);
  const isSsoBlocked = isPersonal && role !== "Principal";

  const [name, setName] = useState(initialName);
  const [rollNumber, setRollNumber] = useState(initialRoll);
  const [department, setDepartment] = useState(
    defaultRole === "Principal" ? "Office of the Principal & Institutional Affairs" : initialDepartment
  );
  const [academicYear, setAcademicYear] = useState<string>("3rd Year");
  const [semester, setSemester] = useState<number>(5);
  const [section, setSection] = useState<string>("Section A");
  const [batchDuration, setBatchDuration] = useState<string>("2024-2028");
  const [designation, setDesignation] = useState(
    defaultRole === "Principal" ? "Principal / Super-Admin" : "Assistant Professor"
  );

  // Faculty Routine Claiming state
  const [unclaimedSlots, setUnclaimedSlots] = useState<UnclaimedProfile[]>([]);
  const [claimedFacultyName, setClaimedFacultyName] = useState<string>("");
  const [isLoadingUnclaimed, setIsLoadingUnclaimed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-sync Academic Year when Semester changes
  const handleSemesterChange = (newSem: number) => {
    setSemester(newSem);
    if (newSem <= 2) setAcademicYear("1st Year");
    else if (newSem <= 4) setAcademicYear("2nd Year");
    else if (newSem <= 6) setAcademicYear("3rd Year");
    else setAcademicYear("4th Year");
  };

  // Auto-sync Semester when Academic Year changes
  const handleYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    if (newYear === "1st Year" && semester > 2) setSemester(1);
    else if (newYear === "2nd Year" && (semester < 3 || semester > 4)) setSemester(3);
    else if (newYear === "3rd Year" && (semester < 5 || semester > 6)) setSemester(5);
    else if (newYear === "4th Year" && semester < 7) setSemester(7);
  };

  // Fetch unclaimed routine slots for teachers
  useEffect(() => {
    if (role !== "Student" && role !== "Principal" && department) {
      setIsLoadingUnclaimed(true);
      fetch(`/api/routine/unclaimed?department=${encodeURIComponent(department)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.unclaimedProfiles) {
            setUnclaimedSlots(data.unclaimedProfiles);
          } else {
            setUnclaimedSlots([]);
          }
        })
        .catch((err) => {
          console.warn("Error fetching unclaimed routine slots:", err);
          setUnclaimedSlots([]);
        })
        .finally(() => setIsLoadingUnclaimed(false));
    }
  }, [role, department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Strict Institutional SSO Gate
    if (isSsoBlocked) {
      setErrorMessage(STRICT_SSO_ERROR_MESSAGE);
      return;
    }

    if (role === "Student" && !rollNumber.trim()) {
      setErrorMessage("Roll Number is required to map you to your exact classroom roster.");
      return;
    }

    if (role === "Student" && !batchDuration.trim()) {
      setErrorMessage("Batch / Course Duration is required for students.");
      return;
    }

    if (!department) {
      setErrorMessage("Please select your academic department.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          department,
          batchDuration: role === "Student" ? batchDuration.trim() : undefined,
          academicYear: role === "Student" ? academicYear : undefined,
          semester: role === "Student" ? Number(semester) : undefined,
          section: role === "Student" ? section : undefined,
          rollNumber: role === "Student" ? rollNumber.trim().toUpperCase() : (role === "Principal" ? "ADM-PRIN" : undefined),
          designation: role === "Principal" ? "Principal / Super-Admin" : (role !== "Student" ? designation : undefined),
          claimedFacultyName: (role === "Teacher" || role === "HOD") && claimedFacultyName ? claimedFacultyName : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete onboarding.");
      }

      setSuccessMessage(
        "Institutional Profile Verified! Linking to your departmental station..."
      );

      setTimeout(() => {
        const dest = data.targetDashboard || (role === "Student" ? "/dashboard/student" : role === "Principal" ? "/dashboard/principal" : "/dashboard/teacher");
        router.push(dest);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl glass-card border border-sky-500/30 shadow-[0_20px_50px_rgba(2,132,199,0.25)] relative overflow-hidden animate-fade-in text-white">
      {/* Decorative Orbs */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pb-6 border-b border-white/10 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 mb-3 shadow">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mandatory First-Time Institutional Setup</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Institutional Member Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
          Configure your academic hierarchy parameters to link directly to your live timetables and biometric attendance rosters.
        </p>
      </div>

      {/* Strict SSO Domain Restriction Alert */}
      {isSsoBlocked && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-[0_10px_35px_rgba(244,63,94,0.3)] animate-fade-in">
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-extrabold text-rose-300 text-sm sm:text-base tracking-tight">
                Institutional Domain Security Policy
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 border border-rose-500/40 text-rose-200 uppercase tracking-wider">
                Access Prohibited
              </span>
            </div>
            <p className="font-bold text-white text-xs sm:text-sm leading-relaxed">
              Strict SSO: Please use your official college email ID provided by the institution.
            </p>
            <p className="text-[11px] text-slate-300 leading-normal">
              Consumer accounts (<span className="font-mono text-rose-300 font-bold">{initialEmail}</span>) cannot be enrolled as a <strong>{role}</strong>. Faculty and students must authenticate via official institutional credentials.
            </p>
            <div className="pt-2 text-[11px] text-amber-300 flex items-center gap-1.5 font-medium border-t border-rose-500/20">
              <School className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>To test or manage the system with this personal email, switch your role to <strong>Principal (Admin)</strong>.</span>
            </div>
          </div>
        </div>
      )}

      {isPersonal && role === "Principal" && (
        <div className="mb-6 p-4 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-sky-200 text-xs sm:text-sm flex items-start gap-3 shadow animate-fade-in">
          <ShieldCheck className="w-5 h-5 shrink-0 text-sky-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-white text-xs sm:text-sm">
              Principal / Super-Admin Whitelist Active
            </div>
            <p className="text-[11px] text-sky-200/90 leading-normal">
              Your personal email (<span className="font-mono text-sky-300 font-bold">{initialEmail}</span>) is authorized exclusively for institutional leadership, supervisor testing, timetable synchronization, and faculty roster oversight.
            </p>
          </div>
        </div>
      )}

      {errorMessage && !isSsoBlocked && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm relative z-10">
        {/* Full Name & Verified Institutional Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Full Official Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Authenticated Email</span>
              {isPersonal && (
                <span className="text-[10px] text-amber-400 font-mono">Personal Email</span>
              )}
            </label>
            <input
              type="email"
              disabled
              value={initialEmail}
              className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm cursor-not-allowed font-mono ${
                isPersonal
                  ? "bg-slate-900/80 border-amber-500/30 text-amber-300"
                  : "bg-slate-900/60 border-white/5 text-slate-400"
              }`}
            />
          </div>
        </div>

        {/* Institutional Role Selector */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
            <span>Institutional Role</span>
            {isPersonal && (
              <span className="text-[10px] text-amber-400 font-medium">
                Personal email allowed for Principal only
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "Student", label: "Student", icon: GraduationCap },
              { id: "Teacher", label: "Faculty / Teacher", icon: Briefcase },
              { id: "HOD", label: "Head of Dept (HOD)", icon: ShieldCheck },
              { id: "Principal", label: "Principal (Admin)", icon: School },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = role === r.id;
              const isBlocked = isPersonal && r.id !== "Principal";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id as any);
                    if (isPersonal && r.id !== "Principal") {
                      setErrorMessage(STRICT_SSO_ERROR_MESSAGE);
                    } else {
                      setErrorMessage(null);
                    }
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-semibold transition-all cursor-pointer pointer-events-auto relative ${
                    isSelected
                      ? isBlocked
                        ? "bg-rose-500/20 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                        : "bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                      : isBlocked
                      ? "bg-slate-950/60 border-rose-500/20 text-rose-400/70 hover:text-rose-300 hover:border-rose-500/40"
                      : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs text-center">{r.label}</span>
                  {isBlocked && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Academic Department */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
            <span>Academic Department</span>
            <span className="text-[10px] text-sky-400">Parameter 1 of 4</span>
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs sm:text-sm cursor-pointer"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept} className="bg-slate-900 text-white">
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* ============================================================== */}
        {/* STUDENT CONDITIONAL PARAMETERS                                 */}
        {/* ============================================================== */}
        {role === "Student" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-white/10"
          >
            {/* Batch / Course Duration (Mandatory) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Batch / Course Duration (Mandatory)</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono">e.g. 2024-2028</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BATCH_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBatchDuration(opt)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      batchDuration === opt
                        ? "bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                        : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Roll Number */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Roll / Reg. No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2023-BCA-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-400 uppercase text-xs"
                />
              </div>

              {/* 2. Academic Year */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Academic Year</span>
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs cursor-pointer font-medium"
                >
                  {ACADEMIC_YEARS.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Semester (1-8) */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Semester</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => handleSemesterChange(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs cursor-pointer font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem} className="bg-slate-900">
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Section (CRITICAL) */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Section (Critical)</span>
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-sky-400/40 text-amber-300 focus:outline-none focus:border-sky-400 text-xs cursor-pointer font-bold"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec} className="bg-slate-900 text-white font-normal">
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-center gap-2.5">
              <School className="w-4 h-4 shrink-0 text-sky-400" />
              <span>
                Your <strong>Department ({department.split(" ")[0]})</strong>, <strong>Batch {batchDuration}</strong>, <strong>{academicYear}</strong>, <strong>Sem {semester}</strong>, and <strong>{section}</strong> precisely isolate your timetable lectures and attendance ledger.
              </span>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* TEACHER / HOD CONDITIONAL FIELDS & ROUTINE CLAIMING            */}
        {/* ============================================================== */}
        {(role === "Teacher" || role === "HOD") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-white/10"
          >
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Faculty Designation
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs sm:text-sm cursor-pointer"
              >
                {DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig} className="bg-slate-900">
                    {desig}
                  </option>
                ))}
              </select>
            </div>

            {/* Claim Unassigned Routine Profile Dropdown */}
            {unclaimedSlots.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Claim Your Timetable Routine Slots (Recommended)</span>
                </label>
                <p className="text-[11px] text-slate-300">
                  The HOD has uploaded timetable routines with unassigned faculty slots. Select your name to automatically link all scheduled lectures to your profile:
                </p>
                <select
                  value={claimedFacultyName}
                  onChange={(e) => setClaimedFacultyName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- No timetable slot to claim (New Faculty) --</option>
                  {unclaimedSlots.map((slot, idx) => (
                    <option key={idx} value={slot.teacherName}>
                      {slot.teacherName} ({slot.classCount} classes &bull; {slot.subjects.slice(0, 2).join(", ")})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Faculty profiles link directly to routine attendance registers across your department without creating ghost accounts.
              </span>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* PRINCIPAL CONDITIONAL FIELDS & SUPERVISION SCOPE              */}
        {/* ============================================================== */}
        {role === "Principal" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-white/10"
          >
            <div className="p-4 rounded-2xl bg-sky-950/60 border border-sky-400/30 space-y-2 text-slate-200">
              <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                <School className="w-4 h-4 text-sky-400" />
                <span>Supreme Executive Authority & Administrative Testing</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                As Principal, you have unrestricted cross-departmental oversight. You can inspect all student attendance rates, monitor teacher lecture progress, operate as any HOD to upload timetables, and authorize institutional leaves.
              </p>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isSsoBlocked}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
              isSsoBlocked
                ? "bg-slate-900 border-2 border-rose-500/40 text-rose-300/80 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_30px_rgba(56,189,248,0.4)] cursor-pointer pointer-events-auto"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registering Profile...</span>
              </>
            ) : isSsoBlocked ? (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Strict SSO: College Email Required for {role}</span>
              </>
            ) : (
              <>
                <span>Complete Institutional Setup ({role})</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
