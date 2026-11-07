"use client";

import React, { useState } from "react";
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
  UserCheck
} from "lucide-react";

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Bachelor of Computer Applications (BCA)",
  "Master of Computer Applications (MCA)",
  "Data Science & Analytics",
  "General Academic & Sciences",
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

export function OnboardingForm({
  initialEmail,
  initialName = "",
  initialRole = "Student",
  initialDepartment = "Computer Science & Engineering",
  initialRoll = "",
}: OnboardingFormProps) {
  const router = useRouter();

  const [role, setRole] = useState<"Student" | "Teacher" | "HOD">(
    initialRole === "Principal" ? "Teacher" : initialRole === "HOD" ? "HOD" : initialRole
  );
  const [name, setName] = useState(initialName);
  const [rollNumber, setRollNumber] = useState(initialRoll);
  const [department, setDepartment] = useState(initialDepartment);
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");
  const [designation, setDesignation] = useState("Assistant Professor");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (role === "Student" && !rollNumber.trim()) {
      setErrorMessage("Roll Number is required to map you to your exact classroom roster.");
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
          rollNumber: role === "Student" ? rollNumber.trim().toUpperCase() : undefined,
          semester: role === "Student" ? Number(semester) : undefined,
          section: role === "Student" ? section.trim().toUpperCase() : undefined,
          designation: role !== "Student" ? designation : undefined,
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
        const dest = data.targetDashboard || (role === "Student" ? "/dashboard/student" : "/dashboard/teacher");
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

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Complete Academic Registration
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          Link your official college credentials to your assigned department, classroom rosters, and biometric attendance records.
        </p>

        {/* Verified Email Chip */}
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Authenticated Email:</span>
          <span className="font-mono text-sky-300 font-bold">{initialEmail}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative z-10 space-y-5 text-xs">
        {/* Role Switcher Tabs */}
        <div>
          <label className="block text-slate-300 font-semibold mb-2">
            Institutional Classification
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-950/70 border border-white/10">
            <button
              type="button"
              onClick={() => setRole("Student")}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                role === "Student"
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg border border-sky-400/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student / Scholar</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("Teacher")}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                role !== "Student"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg border border-emerald-400/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Faculty / HOD</span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Full Legal Academic Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Aryan Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 text-sm"
          />
        </div>

        {/* Academic Department */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Academic Department & Discipline
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

        {/* STUDENT CONDITIONAL FIELDS */}
        {role === "Student" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-2 border-t border-white/10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Roll Number */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1">
                  Roll / Registration No.
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023-CSE-042"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-400 uppercase text-xs"
                  />
                </div>
              </div>

              {/* Semester */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1">
                  Current Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400 text-xs cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem} className="bg-slate-900">
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-semibold mb-1">
                  Section / Batch
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, or Alpha"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 uppercase text-xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] flex items-center gap-2">
              <School className="w-4 h-4 shrink-0 text-sky-400" />
              <span>
                Your roll number and semester determine which physical lecture halls and QR attendance sessions you are registered for.
              </span>
            </div>
          </motion.div>
        )}

        {/* TEACHER / HOD CONDITIONAL FIELDS */}
        {role !== "Student" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-2 border-t border-white/10"
          >
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Academic Designation & Title
              </label>
              <select
                value={designation}
                onChange={(e) => {
                  const val = e.target.value;
                  setDesignation(val);
                  if (val.toLowerCase().includes("head of department") || val === "Head of Department (HOD)") {
                    setRole("HOD");
                  } else {
                    setRole("Teacher");
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-emerald-400 text-xs sm:text-sm cursor-pointer"
              >
                {DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig} className="bg-slate-900">
                    {desig}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Selecting &quot;Head of Department (HOD)&quot; enables branch-wide leave approvals, timetable ingestion, and faculty workload monitoring.
              </span>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Into College Ledger...</span>
              </>
            ) : (
              <>
                <span>Complete Institutional Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

