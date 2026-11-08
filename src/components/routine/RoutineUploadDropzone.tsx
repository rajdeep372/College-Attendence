"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  Sparkles, 
  Check, 
  CheckCircle2,
  AlertCircle, 
  Clock, 
  UserCheck, 
  Calendar, 
  RefreshCw,
  Building,
  GraduationCap,
  Layers,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  UserPlus
} from "lucide-react";
import { DEPARTMENTS, ACADEMIC_YEARS, SECTIONS } from "@/components/onboarding/OnboardingForm";

interface RoutineClassItem {
  timeSlot: string;
  paperCode?: string;
  subject: string;
  teacherName: string;
}

interface GroupedDayRoutine {
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  classes: RoutineClassItem[];
}

interface RegisteredTeacher {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
}

export function RoutineUploadDropzone({
  defaultDepartment = "Computer Science & Engineering (CSE)",
  defaultSemester = 5,
  defaultAcademicYear = "3rd Year",
  defaultSection = "Section A",
}: {
  defaultDepartment?: string;
  defaultSemester?: number;
  defaultAcademicYear?: string;
  defaultSection?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [department, setDepartment] = useState(defaultDepartment);
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [semester, setSemester] = useState(defaultSemester);
  const [section, setSection] = useState(defaultSection);

  // States
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Review & Mapping State
  const [step, setStep] = useState<"upload" | "review" | "saved">("upload");
  const [groupedRoutines, setGroupedRoutines] = useState<GroupedDayRoutine[]>([]);
  const [extractedFaculties, setExtractedFaculties] = useState<string[]>([]);
  const [registeredTeachers, setRegisteredTeachers] = useState<RegisteredTeacher[]>([]);
  const [facultyMapping, setFacultyMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Year and Semester
  const handleSemesterChange = (newSem: number) => {
    setSemester(newSem);
    if (newSem <= 2) setAcademicYear("1st Year");
    else if (newSem <= 4) setAcademicYear("2nd Year");
    else if (newSem <= 6) setAcademicYear("3rd Year");
    else setAcademicYear("4th Year");
  };

  const handleYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    if (newYear === "1st Year" && semester > 2) setSemester(1);
    else if (newYear === "2nd Year" && (semester < 3 || semester > 4)) setSemester(3);
    else if (newYear === "3rd Year" && (semester < 5 || semester > 6)) setSemester(5);
    else if (newYear === "4th Year" && semester < 7) setSemester(7);
  };

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/") && !selectedFile.type.includes("pdf")) {
      setErrorMessage("Please upload an image file (PNG, JPG, WEBP, or JPEG) or PDF.");
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    setStatusMessage(null);
    setSaveSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Step 1: Upload and extract using Gemini Vision AI
  const handleScanAndParse = async () => {
    if (!file) {
      setErrorMessage("Please select or drop a timetable image first.");
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setStatusMessage("Analyzing image with Gemini Vision AI & extracting table rows...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("department", department);
      formData.append("academicYear", academicYear);
      formData.append("semester", semester.toString());
      formData.append("section", section);

      const res = await fetch("/api/routine/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract routine from image.");
      }

      const extracted: string[] = data.extractedFaculties || [];
      const teachers: RegisteredTeacher[] = data.registeredTeachers || [];

      // Auto-match faculty names if possible, else "unclaimed"
      const initialMapping: Record<string, string> = {};
      for (const rawName of extracted) {
        const cleanRaw = rawName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, "").toLowerCase().trim();
        const matchedTeacher = teachers.find((t) => {
          const cleanTName = t.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, "").toLowerCase().trim();
          return cleanTName.includes(cleanRaw) || cleanRaw.includes(cleanTName);
        });

        if (matchedTeacher) {
          initialMapping[rawName] = matchedTeacher._id;
        } else {
          initialMapping[rawName] = "unclaimed";
        }
      }

      setGroupedRoutines(data.groupedRoutines || []);
      setExtractedFaculties(extracted);
      setRegisteredTeachers(teachers);
      setFacultyMapping(initialMapping);
      setStep("review");
      setStatusMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to AI Parser";
      setErrorMessage(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingChange = (extractedName: string, selectedValue: string) => {
    setFacultyMapping((prev) => ({
      ...prev,
      [extractedName]: selectedValue,
    }));
  };

  // Step 2: Confirm mapping and save routine to MongoDB (Strict Day-Grouped, No Ghost Users)
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/routine/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          academicYear,
          semester,
          section,
          groupedRoutines,
          facultyMapping,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save timetable to database.");
      }

      setStep("saved");
      setSaveSuccessMessage(
        `Successfully linked and saved ${data.daysSaved} days with ${data.totalClasses} scheduled lectures for ${department} (${section}) into MongoDB. Zero ghost accounts created.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving routine";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setGroupedRoutines([]);
    setExtractedFaculties([]);
    setRegisteredTeachers([]);
    setFacultyMapping({});
    setStep("upload");
    setStatusMessage(null);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalClassesCount = groupedRoutines.reduce((acc, curr) => acc + curr.classes.length, 0);

  return (
    <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-400/30 shadow-[0_15px_45px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>Strict Day-Grouped Architecture &bull; Faculty Bridge Mapping</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Smart AI Timetable Parser & Bridge Sync
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Upload complex routine images. The AI extracts lectures grouped strictly by day, omits lunch breaks, and bridges extracted names to registered professors without creating ghost user accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {step !== "upload" && (
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload Another Routine</span>
            </button>
          )}
        </div>
      </div>

      {/* Target 4-Parameter Hierarchy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-900/60 dark:border-white/5 text-xs">
        {/* 1. Department */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Target Department</span>
          </label>
          <select
            value={department}
            disabled={step !== "upload"}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-sky-500 dark:bg-slate-800/80 dark:border-sky-500/20 dark:text-white transition-colors disabled:opacity-60 shadow-sm"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Academic Year */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Academic Year</span>
          </label>
          <select
            value={academicYear}
            disabled={step !== "upload"}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-sky-500 dark:bg-slate-800/80 dark:border-sky-500/20 dark:text-white transition-colors font-medium disabled:opacity-60 shadow-sm"
          >
            {ACADEMIC_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Semester */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Semester</span>
          </label>
          <select
            value={semester}
            disabled={step !== "upload"}
            onChange={(e) => handleSemesterChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-sky-500 dark:bg-slate-800/80 dark:border-sky-500/20 dark:text-white transition-colors font-medium disabled:opacity-60 shadow-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Section (CRITICAL) */}
        <div>
          <label className="block text-xs font-semibold text-amber-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Section (Critical)</span>
          </label>
          <select
            value={section}
            disabled={step !== "upload"}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs focus:outline-none focus:border-amber-500 dark:bg-slate-800/80 dark:border-amber-500/30 dark:text-amber-300 transition-colors font-bold disabled:opacity-60 shadow-sm"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STEP 1: UPLOAD DROPZONE */}
      {step === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center overflow-hidden ${
            isDragOver
              ? "border-cyan-400 bg-sky-50 dark:bg-sky-950/40 shadow-md scale-[1.01]"
              : file
              ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/10"
              : "border-sky-300 hover:border-sky-500 bg-slate-50/60 hover:bg-slate-100/60 dark:border-sky-500/30 dark:hover:border-sky-400/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            accept="image/*,.pdf"
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-36 h-28 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <img
                  src={previewUrl}
                  alt="Routine Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">{file?.name}</div>
              <div className="text-[11px] text-sky-700 dark:text-sky-300">
                {(file!.size / 1024).toFixed(1)} KB &bull; Click or drop another to replace
              </div>
            </div>
          ) : (
            <>
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-100 to-blue-200 dark:from-sky-500/20 dark:to-blue-600/30 border border-sky-300 dark:border-sky-400/40 flex items-center justify-center text-sky-700 dark:text-sky-300 mb-3 shadow-sm dark:shadow-[0_0_20px_rgba(56,189,248,0.25)]"
              >
                <UploadCloud className="w-8 h-8" />
              </motion.div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Drag & Drop Routine Image Here, or <span className="text-sky-600 dark:text-sky-400 underline">Browse</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Supports camera snapshots, PNG, JPG, or PDF timetables. Gemini AI analyzes table grids and secondary paper legends.
              </p>
            </>
          )}
        </div>
      )}

      {/* Upload Action Bar */}
      {step === "upload" && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {errorMessage && (
              <div className="flex items-center gap-2 text-xs font-medium text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="flex items-center gap-2 text-xs font-medium text-sky-400 bg-sky-950/40 p-2.5 rounded-xl border border-sky-500/30">
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-sky-400" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleScanAndParse}
            disabled={!file || isParsing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini OCR Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scan & Map to {section}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: REVIEW & MAP FACULTY BRIDGE */}
      <AnimatePresence>
        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 pt-4"
          >
            {/* Status / Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 text-xs font-medium text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bridge Notice Card */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-300 dark:bg-slate-900/80 dark:border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30 shrink-0 mt-0.5">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Faculty Mapping Bridge (Zero Ghost Accounts)
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Map extracted faculty names to registered professors in <strong>{department}</strong>, or keep as <em>Unclaimed</em>. Unclaimed slots can be claimed by teachers during onboarding.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 shrink-0">
                {extractedFaculties.length} Extracted Faculty Names
              </span>
            </div>

            {/* Faculty Mapping Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 shadow-sm">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3">Extracted Timetable Name</th>
                    <th className="px-4 py-3">Assigned Classes</th>
                    <th className="px-4 py-3">Map to Registered Professor</th>
                    <th className="px-4 py-3 text-right">Mapping Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {extractedFaculties.map((rawName, idx) => {
                    const currentMapping = facultyMapping[rawName] || "unclaimed";
                    const isMapped = currentMapping !== "unclaimed";
                    const mappedTeacher = registeredTeachers.find((t) => t._id === currentMapping);
                    
                    // Count classes for this faculty across all days
                    const facultyClassCount = groupedRoutines.reduce((count, day) => {
                      return count + day.classes.filter((c) => c.teacherName === rawName).length;
                    }, 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-sky-700 dark:text-sky-300">{rawName}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                          {facultyClassCount} {facultyClassCount === 1 ? "lecture" : "lectures"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={currentMapping}
                            onChange={(e) => handleMappingChange(rawName, e.target.value)}
                            className="w-full max-w-sm px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-sky-500/30 dark:text-white text-xs focus:outline-none focus:border-sky-500 shadow-sm"
                          >
                            <option value="unclaimed" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                              &bull; Mark as Unclaimed Routine Slot (Claimable on Onboarding)
                            </option>
                            {registeredTeachers.map((t) => (
                              <option key={t._id} value={t._id} className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
                                {t.name} ({t.designation || "Faculty"} &bull; {t.email})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isMapped ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                              <UserCheck className="w-3 h-3" />
                              <span>Mapped to {mappedTeacher?.name.split(" ")[0]}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Unclaimed Slot</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* STRICT DAY-GROUPED SCHEDULE PREVIEW (ONE OBJECT/CARD PER DAY) */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>
                    Day-Grouped Schedule Preview &bull; {department.split(" ")[0]} ({academicYear} &bull; Sem {semester} &bull; <strong className="text-amber-700 dark:text-amber-300">{section}</strong>)
                  </span>
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30">
                    {groupedRoutines.length} Active Days
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {totalClassesCount} Total Classes
                  </span>
                </div>
              </div>

              {/* Day Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedRoutines.map((dayGroup) => (
                  <div
                    key={dayGroup.dayOfWeek}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900/70 dark:border-white/10 flex flex-col justify-between shadow-sm"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-3">
                      <span className="font-bold text-sm text-sky-700 dark:text-sky-400 tracking-wide uppercase">
                        {dayGroup.dayOfWeek}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {dayGroup.classes.length} {dayGroup.classes.length === 1 ? "Class" : "Classes"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayGroup.classes.map((cls, idx) => {
                        const mappedId = facultyMapping[cls.teacherName];
                        const isMapped = mappedId && mappedId !== "unclaimed";
                        const verifiedTeacher = registeredTeachers.find((t) => t._id === mappedId);

                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 dark:bg-slate-950/60 dark:border-white/5 flex flex-col gap-1 text-xs"
                          >
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="font-mono text-sky-700 dark:text-sky-300 flex items-center gap-1 text-[11px]">
                                <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                {cls.timeSlot}
                              </span>
                              {cls.paperCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                                  {cls.paperCode}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {cls.subject}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                <span>{cls.teacherName}</span>
                              </span>
                              {isMapped ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  &rarr; {verifiedTeacher?.name}
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400/80 italic font-mono text-[10px]">
                                  Unclaimed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation & Save Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-white/10 transition-all cursor-pointer"
              >
                Cancel & Re-upload
              </button>

              <button
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inserting Day-Grouped Routines...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Mapping & Save Routine to Database</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 3: SAVED CONFIRMATION */}
      <AnimatePresence>
        {step === "saved" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center flex flex-col items-center justify-center gap-4 my-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h4 className="text-lg font-bold text-white">Timetable Saved Successfully!</h4>
              <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                {saveSuccessMessage}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload Another Routine</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
