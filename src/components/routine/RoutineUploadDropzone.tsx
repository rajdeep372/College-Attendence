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
  BookOpen
} from "lucide-react";
import { DEPARTMENTS, ACADEMIC_YEARS, SECTIONS } from "@/components/onboarding/OnboardingForm";

interface ParsedClass {
  dayOfWeek: string;
  timeSlot: string;
  paperCode?: string;
  subject: string;
  teacher: string;
  semester: number;
  academicYear?: string;
  section?: string;
  department: string;
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

  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedResults, setParsedResults] = useState<ParsedClass[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setErrorMessage("Please upload an image file (PNG, JPG, WEBP, or JPEG).");
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    setParsedResults(null);
    setStatusMessage(null);

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

  const handleUploadAndParse = async () => {
    if (!file) {
      setErrorMessage("Please choose or drop an image file first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Scanning routine with Gemini Vision AI & extracting table rows...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("department", department);
      formData.append("academicYear", academicYear);
      formData.append("semester", semester.toString());
      formData.append("section", section);
      formData.append("save", "true"); // Bulk insert into MongoDB

      const res = await fetch("/api/routine/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse routine.");
      }

      setParsedResults(data.data || []);
      setStatusMessage(
        data.isAiSimulated
          ? `Extracted & Saved ${data.count} classes into MongoDB Routine collection for ${department} (${academicYear} • Sem ${semester} • ${section}).`
          : `Extracted & Saved ${data.count} classes into MongoDB via Gemini Vision AI.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to AI Parser";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setParsedResults(null);
    setStatusMessage(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-400/30 shadow-[0_15px_45px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Multimodal Gemini AI Engine &bull; Strict 4-Parameter Mapping</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Smart AI Timetable Parser & Database Sync
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Upload complex college routine images. The AI resolves main timetable grid slots, omits lunch breaks, maps multi-period labs, cross-references paper codes to faculty names, and binds strictly to Year, Semester, and Section.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {parsedResults && (
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Parse Another</span>
            </button>
          )}
        </div>
      </div>

      {/* Target 4-Parameter Hierarchy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs">
        {/* 1. Department */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Department</span>
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-sky-500/20 text-white text-xs focus:outline-none focus:border-sky-400 transition-colors"
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
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Academic Year</span>
          </label>
          <select
            value={academicYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-sky-500/20 text-white text-xs focus:outline-none focus:border-sky-400 transition-colors font-medium"
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
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Semester</span>
          </label>
          <select
            value={semester}
            onChange={(e) => handleSemesterChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-sky-500/20 text-white text-xs focus:outline-none focus:border-sky-400 transition-colors font-medium"
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
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Section (Critical)</span>
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-amber-500/30 text-amber-300 text-xs focus:outline-none focus:border-amber-400 transition-colors font-bold"
          >
            {SECTIONS.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dropzone Container */}
      {!parsedResults && (
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
              ? "border-cyan-400 bg-sky-950/40 shadow-[0_0_35px_rgba(56,189,248,0.3)] scale-[1.01]"
              : file
              ? "border-emerald-500/40 bg-emerald-950/10"
              : "border-sky-500/30 hover:border-sky-400/60 bg-slate-900/40 hover:bg-slate-900/70"
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
              <div className="text-xs font-semibold text-white">{file?.name}</div>
              <div className="text-[11px] text-sky-300">
                {(file!.size / 1024).toFixed(1)} KB &bull; Click or drop another to replace
              </div>
            </div>
          ) : (
            <>
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 border border-sky-400/40 flex items-center justify-center text-sky-300 mb-3 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
              >
                <UploadCloud className="w-8 h-8" />
              </motion.div>
              <div className="text-sm font-bold text-white">
                Drag & Drop Routine Image Here, or <span className="text-sky-400 underline">Browse</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Supports camera snapshots, PNG, JPG, or PDF timetables. Gemini AI analyzes table grids automatically.
              </p>
            </>
          )}
        </div>
      )}

      {/* Action Buttons & Status */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {errorMessage && (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {!parsedResults && (
          <button
            onClick={handleUploadAndParse}
            disabled={!file || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini AI Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Parse & Bind to {section}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Parsed Result Table */}
      <AnimatePresence>
        {parsedResults && parsedResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-6 border-t border-white/10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>
                  Extracted Schedule &bull; {department.split(" ")[0]} ({academicYear} &bull; Sem {semester} &bull; <strong className="text-amber-300">{section}</strong>)
                </span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {parsedResults.length} Lectures Saved
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Time Slot</th>
                    <th className="px-4 py-3">Resolved Subject</th>
                    <th className="px-4 py-3">Assigned Faculty</th>
                    <th className="px-4 py-3 text-right">Target Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parsedResults.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-300 border border-sky-800/60">
                          {item.dayOfWeek}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex items-center gap-1.5 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>{item.timeSlot}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {item.subject}
                      </td>
                      <td className="px-4 py-3 text-slate-200 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{item.teacher}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {section}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
