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
  AlertTriangle,
  Lock
} from "lucide-react";
import { UserRole } from "@/models/User";
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
  initialRole?: UserRole | string;
  initialDisplayRole?: string;
  initialDepartment?: string;
  initialRoll?: string;
  initialIsLocked?: boolean;
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
  initialDisplayRole,
  initialDepartment = "Computer Science & Engineering (CSE)",
  initialRoll = "",
  initialIsLocked = false,
}: OnboardingFormProps) {
  const router = useRouter();

  const [isVerifyingCredentials, setIsVerifyingCredentials] = useState(true);
  const [role, setRole] = useState<string>(initialRole || "Student");
  const [displayRole, setDisplayRole] = useState<string>(
    initialDisplayRole || initialRole || "Student"
  );
  const [isWhitelistedStaff, setIsWhitelistedStaff] = useState<boolean>(
    initialRole === "Teacher" ||
    initialRole === "HOD" ||
    initialRole === "Principal" ||
    initialRole === "Faculty / Teacher" ||
    initialRole === "Head of Dept (HOD)" ||
    initialRole === "Principal (Admin)"
  );
  const [isStaffLocked, setIsStaffLocked] = useState<boolean>(initialIsLocked);

  const isStudent = role === "Student";
  const isPrincipal = role === "Principal" || role === "Principal (Admin)" || (role || "").includes("Principal");
  const isTeacherOrHod = !isStudent && !isPrincipal;

  const isPersonal = isPersonalEmail(initialEmail) && !isPrincipalSuperAdmin(initialEmail);
  const isSsoBlocked = isPersonal && !isPrincipal && !isWhitelistedStaff;

  const [name, setName] = useState(initialName);
  const [rollNumber, setRollNumber] = useState(initialRole === "Student" ? initialRoll : "");
  const [department, setDepartment] = useState(
    isPrincipal ? "Office of the Principal & Institutional Affairs" : initialDepartment
  );
  const [academicYear, setAcademicYear] = useState<string>("3rd Year");
  const [semester, setSemester] = useState<number>(5);
  const [section, setSection] = useState<string>("Section A");
  const [batchDuration, setBatchDuration] = useState<string>("2024-2028");
  const [designation, setDesignation] = useState(
    isPrincipal ? "Principal (Admin)" : "Assistant Professor"
  );

  // Verification on mount
  useEffect(() => {
    let isMounted = true;
    async function verifyInstitutionalCredentials() {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.onboarded && data.targetDashboard) {
          router.replace(data.targetDashboard);
          return;
        }

        if (data.assignedRole) {
          setRole(data.assignedRole);
          setDisplayRole(data.displayRole || data.assignedRole);
          const isStaff = data.assignedRole !== "Student";
          setIsWhitelistedStaff(Boolean(data.isWhitelisted || isStaff));

          if (data.isStaffLocked !== undefined) {
            setIsStaffLocked(Boolean(data.isStaffLocked));
          } else if (isStaff) {
            setIsStaffLocked(true);
          }

          if (data.name) {
            setName(data.name);
          }
          if (data.department) {
            setDepartment(data.department);
          }

          if (data.assignedRole.toLowerCase().includes("principal") || data.assignedRole.toLowerCase().includes("admin")) {
            setDepartment("Office of the Principal & Institutional Affairs");
            setDesignation("Principal (Admin)");
          }
        }
      } catch (err) {
        console.warn("Error verifying institutional credentials:", err);
      } finally {
        if (isMounted) {
          setIsVerifyingCredentials(false);
        }
      }
    }

    verifyInstitutionalCredentials();
    return () => {
      isMounted = false;
    };
  }, [router]);

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

    if (isStudent && !rollNumber.trim()) {
      setErrorMessage("Roll Number is required to map you to your exact classroom roster.");
      return;
    }

    if (isStudent && !batchDuration.trim()) {
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
          department,
          batchDuration: isStudent ? batchDuration.trim() : undefined,
          academicYear: isStudent ? academicYear : undefined,
          semester: isStudent ? Number(semester) : undefined,
          section: isStudent ? section : undefined,
          rollNumber: isStudent ? rollNumber.trim().toUpperCase() : (isPrincipal ? "ADM-PRIN" : undefined),
          designation: isPrincipal ? "Principal (Admin)" : (isTeacherOrHod ? designation : undefined),
          claimedFacultyName: isTeacherOrHod && claimedFacultyName ? claimedFacultyName : undefined,
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
        const dest = data.targetDashboard || (isStudent ? "/dashboard/student" : isPrincipal ? "/dashboard/principal" : "/dashboard/teacher");
        router.push(dest);
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (isVerifyingCredentials) {
    return (
      <div className="w-full max-w-md mx-auto p-8 rounded-3xl glass-card border border-sky-300 dark:border-sky-500/30 shadow-xl dark:shadow-[0_20px_50px_rgba(2,132,199,0.25)] relative overflow-hidden text-slate-900 dark:text-white text-center animate-fade-in">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center py-8 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner">
              <ShieldCheck className="w-8 h-8 animate-pulse text-sky-600 dark:text-sky-400" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-sky-600 dark:text-sky-300 absolute -bottom-1 -right-1" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Verifying Institutional Credentials...
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
              Querying institutional whitelist and configuring zero-trust role permissions for{" "}
              <span className="font-mono text-sky-700 dark:text-sky-300 font-semibold">{initialEmail}</span>
            </p>
          </div>

          <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-slate-300 dark:border-white/5 mt-2">
            <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl glass-card border border-sky-300 dark:border-sky-500/30 shadow-xl dark:shadow-[0_20px_50px_rgba(2,132,199,0.25)] relative overflow-hidden animate-fade-in text-slate-900 dark:text-white">
      {/* Decorative Orbs */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pb-6 border-b border-slate-200 dark:border-white/10 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30 mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Mandatory First-Time Institutional Setup</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Institutional Member Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
          Configure your academic hierarchy parameters to link directly to your live timetables and biometric attendance rosters.
        </p>
      </div>

      {/* Strict SSO Domain Restriction Alert */}
      {isSsoBlocked && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/50 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-md animate-fade-in">
          <AlertTriangle className="w-6 h-6 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-extrabold text-rose-700 dark:text-rose-300 text-sm sm:text-base tracking-tight">
                Institutional Domain Security Policy
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 border border-rose-200 text-rose-800 dark:bg-rose-500/30 dark:border-rose-500/40 dark:text-rose-200 uppercase tracking-wider">
                Access Prohibited
              </span>
            </div>
            <p className="font-bold text-rose-900 dark:text-white text-xs sm:text-sm leading-relaxed">
              Strict SSO: Please use your official college email ID provided by the institution.
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
              Consumer accounts (<span className="font-mono text-rose-700 dark:text-rose-300 font-bold">{initialEmail}</span>) cannot be enrolled as a <strong>{role}</strong>. Faculty and students must authenticate via official institutional credentials.
            </p>
            <div className="pt-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium border-t border-rose-200 dark:border-rose-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Only the authorized Principal (chatterjeer477@gmail.com) and whitelisted staff may authenticate with personal accounts.</span>
            </div>
          </div>
        </div>
      )}

      {isPersonal && role === "Principal" && (
        <div className="mb-6 p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 dark:bg-sky-500/15 dark:border-sky-400/40 dark:text-sky-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm animate-fade-in">
          <ShieldCheck className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              Principal / Super-Admin Whitelist Active
            </div>
            <p className="text-[11px] text-slate-600 dark:text-sky-200/90 leading-normal">
              Your personal email (<span className="font-mono text-sky-700 dark:text-sky-300 font-bold">{initialEmail}</span>) is authorized exclusively for institutional leadership, supervisor testing, timetable synchronization, and faculty roster oversight.
            </p>
          </div>
        </div>
      )}

      {errorMessage && !isSsoBlocked && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm relative z-10">
        {/* Full Name & Verified Institutional Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Full Official Name</span>
              {isStaffLocked && (
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" /> Locked by Whitelist
                </span>
              )}
            </label>
            <input
              type="text"
              required
              disabled={isStaffLocked}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm shadow-sm ${
                isStaffLocked
                  ? "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/80 dark:border-sky-500/30 dark:text-sky-200 cursor-not-allowed font-medium select-none"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 dark:bg-slate-950/80 dark:border-white/10 dark:text-white dark:placeholder-slate-500 dark:focus:border-sky-400"
              }`}
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Authenticated Email</span>
              {isPersonal && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-medium">Personal Email</span>
              )}
            </label>
            <input
              type="email"
              disabled
              value={initialEmail}
              className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm cursor-not-allowed font-mono shadow-sm ${
                isPersonal
                  ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-slate-900/80 dark:border-amber-500/30 dark:text-amber-300"
                  : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900/60 dark:border-white/5 dark:text-slate-400"
              }`}
            />
          </div>
        </div>

        {/* Backend-Assigned Institutional Role (Zero-Trust RBAC - Read Only) */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
            <span>Assigned Institutional Role</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Backend-Enforced Role</span>
            </span>
          </label>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950/80 dark:border-sky-500/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30">
                {isPrincipal ? (
                  <School className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (role.includes("HOD") || role.includes("Head")) ? (
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (role.includes("Teacher") || role.includes("Faculty")) ? (
                  <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <GraduationCap className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                )}
              </div>
              <div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white block">
                  {displayRole || role}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isPrincipal
                    ? "Institutional Leadership & Super-Admin Authority"
                    : isTeacherOrHod
                    ? "Authorized Teaching Staff Whitelist"
                    : "Enrolled Academic Scholar"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25">
                Role Locked
              </span>
            </div>
          </div>
        </div>

        {/* 1. Academic Department */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
            <span>Academic Department</span>
            {isStaffLocked ? (
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" /> Whitelist Department Locked
              </span>
            ) : role === "Student" ? (
              <span className="text-[10px] text-sky-600 dark:text-sky-400">Parameter 1 of 4</span>
            ) : null}
          </label>
          <select
            disabled={isStaffLocked || isPrincipal}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm shadow-sm ${
              isStaffLocked || isPrincipal
                ? "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/80 dark:border-sky-500/30 dark:text-sky-200 cursor-not-allowed font-medium select-none"
                : "bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 dark:bg-slate-950/80 dark:border-white/10 dark:text-white cursor-pointer"
            }`}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* ============================================================== */}
        {/* STUDENT CONDITIONAL PARAMETERS                                 */}
        {/* STRICT CONDITIONAL: ONLY RENDER IF role === 'Student'          */}
        {/* ============================================================== */}
        {role === "Student" ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/10"
          >
            {/* Batch / Course Duration (Mandatory) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Batch / Course Duration (Mandatory)</span>
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">e.g. 2024-2028</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BATCH_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBatchDuration(opt)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                      batchDuration === opt
                        ? "bg-sky-100 border-sky-400 text-sky-800 dark:bg-sky-500/20 dark:border-sky-400 dark:text-sky-200"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-950/60 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
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
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                  Roll / Reg. No.
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2023-BCA-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-sky-500 dark:bg-slate-950/80 dark:border-white/10 dark:text-white dark:placeholder-slate-500 uppercase text-xs shadow-sm"
                />
              </div>

              {/* 2. Academic Year */}
              <div className="sm:col-span-1">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Academic Year</span>
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 dark:bg-slate-950/80 dark:border-white/10 dark:text-white text-xs cursor-pointer font-medium shadow-sm"
                >
                  {ACADEMIC_YEARS.map((yr) => (
                    <option key={yr} value={yr} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Semester (1-8) */}
              <div className="sm:col-span-1">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Semester</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => handleSemesterChange(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 dark:bg-slate-950/80 dark:border-white/10 dark:text-white text-xs cursor-pointer font-medium shadow-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Section (CRITICAL) */}
              <div className="sm:col-span-1">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center justify-between">
                  <span>Section (Critical)</span>
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 focus:outline-none focus:border-amber-500 dark:bg-slate-950/80 dark:border-sky-400/40 dark:text-amber-300 text-xs cursor-pointer font-bold shadow-sm"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-normal">
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-300 text-xs flex items-center gap-2.5">
              <School className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>
                Your <strong>Department ({department.split(" ")[0]})</strong>, <strong>Batch {batchDuration}</strong>, <strong>{academicYear}</strong>, <strong>Sem {semester}</strong>, and <strong>{section}</strong> precisely isolate your timetable lectures and attendance ledger.
              </span>
            </div>
          </motion.div>
        ) : null}

        {/* ============================================================== */}
        {/* TEACHER / HOD CONDITIONAL FIELDS & ROUTINE CLAIMING            */}
        {/* STRICT: ONLY RENDER IF isTeacherOrHod                          */}
        {/* ============================================================== */}
        {isTeacherOrHod ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/10"
          >
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Faculty Designation</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">Editable Field</span>
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-300 text-emerald-900 focus:outline-none focus:border-emerald-500 dark:bg-slate-950/80 dark:border-emerald-500/40 dark:text-emerald-200 text-xs sm:text-sm cursor-pointer font-semibold shadow-sm"
              >
                {DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {desig}
                  </option>
                ))}
              </select>
            </div>

            {/* Claim Unassigned Routine Profile Dropdown (Yellow Alert Box) */}
            {unclaimedSlots.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/40 space-y-2 shadow-sm">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Claim Your Timetable Routine Slots (Recommended)</span>
                </label>
                <p className="text-[11px] text-amber-800 dark:text-slate-200 leading-relaxed">
                  The HOD has uploaded timetable routines with unassigned faculty slots. Select your name to automatically link all scheduled lectures to your profile:
                </p>
                <select
                  value={claimedFacultyName}
                  onChange={(e) => setClaimedFacultyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs focus:outline-none focus:border-amber-500 dark:bg-slate-950 dark:border-amber-500/50 dark:text-amber-200 cursor-pointer font-semibold shadow-sm"
                >
                  <option value="">-- No timetable slot to claim (New Faculty) --</option>
                  {unclaimedSlots.map((slot, idx) => (
                    <option key={idx} value={slot.teacherName} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                      {slot.teacherName} ({slot.classCount} classes &bull; {slot.subjects.slice(0, 2).join(", ")})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Faculty profiles link directly to routine attendance registers across your department without creating ghost accounts.
              </span>
            </div>
          </motion.div>
        ) : null}

        {/* ============================================================== */}
        {/* PRINCIPAL CONDITIONAL FIELDS & SUPERVISION SCOPE              */}
        {/* STRICT: ONLY RENDER IF isPrincipal                            */}
        {/* ============================================================== */}
        {isPrincipal ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/10"
          >
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 dark:bg-sky-950/60 dark:border-sky-400/30 space-y-2 text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs">
                <School className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Supreme Executive Authority & Administrative Testing</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                As Principal, you have unrestricted cross-departmental oversight. You can inspect all student attendance rates, monitor teacher lecture progress, operate as any HOD to upload timetables, and authorize institutional leaves.
              </p>
            </div>
          </motion.div>
        ) : null}

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
                <span>Complete Institutional Setup ({displayRole || role})</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
