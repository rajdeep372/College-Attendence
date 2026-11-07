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
  RotateCcw,
  Sparkles,
  GraduationCap,
  Users,
  Check,
  X
} from "lucide-react";

interface StudentItem {
  _id: string;
  name: string;
  email: string;
  roll: string;
  department: string;
  profilePicture: string;
}

interface RoutineDetails {
  _id: string;
  subject: string;
  department: string;
  semester: number;
  timeSlot: string;
  dayOfWeek: string;
}

export function AbsentFirstGridView() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [routine, setRoutine] = useState<RoutineDetails | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  // absentIds stores the Set of student IDs marked ABSENT (by default empty, so all are Present!)
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    presentCount: number;
    absentCount: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayClassRoster();
  }, []);

  const fetchTodayClassRoster = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load class roster");
      }
      setStudents(data.students || []);
      setRoutine(data.routine || null);
      if (data.teacher?._id) setTeacherId(data.teacher._id);
      // By default: all students are Present, absentIds is empty
      setAbsentIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching roster";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle single student card: Absent <-> Present
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

  // Quick actions
  const markAllPresent = () => {
    setAbsentIds(new Set());
  };

  const markAllAbsent = () => {
    setAbsentIds(new Set(students.map((s) => s._id)));
  };

  // Submit attendance to MongoDB
  const handleSubmitAttendance = async () => {
    if (!routine?._id) {
      setError("No active routine class loaded.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const absentArray = Array.from(absentIds);
    const presentArray = students
      .filter((s) => !absentIds.has(s._id))
      .map((s) => s._id);

    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineId: routine._id,
          presentStudents: presentArray,
          absentStudents: absentArray,
          markedBy: teacherId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record attendance");
      }

      setSubmissionSuccess({
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        message: data.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEnrolled = students.length;
  const absentCount = absentIds.size;
  const presentCount = totalEnrolled - absentCount;
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 100;

  return (
    <div className="relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-400/30 shadow-[0_15px_45px_rgba(2,132,199,0.15)] overflow-hidden">
      {/* Glow Halo */}
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header & Class Schedule Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Absent-First Fast Tally Console</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {routine ? routine.subject : "Lecture Hall Roll Call"}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
            <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{routine?.department || "Computer Science"} &bull; Sem {routine?.semester || 5}</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{routine?.timeSlot || "11:30 AM - 12:30 PM"} ({routine?.dayOfWeek || "Today"})</span>
            </span>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/10 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Enrolled</div>
            <div className="text-xl font-bold text-white">{totalEnrolled}</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-center">
            <div className="text-[10px] text-emerald-400 uppercase font-mono">Present</div>
            <div className="text-xl font-black text-emerald-300">{presentCount}</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-center">
            <div className="text-[10px] text-rose-400 uppercase font-mono">Absent</div>
            <div className="text-xl font-black text-rose-300">{absentCount}</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-sky-950/50 border border-sky-500/30 text-center">
            <div className="text-[10px] text-sky-400 uppercase font-mono">Rate</div>
            <div className="text-xl font-black text-sky-300">{attendanceRate}%</div>
          </div>
        </div>
      </div>

      {/* Control Bar & Quick Batch Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 my-2 border-b border-white/5">
        <div className="text-xs text-slate-300">
          💡 <strong>Absent-First Logic:</strong> All scholars are marked <strong>Present</strong> by default. <span className="text-rose-400 font-semibold">Tap any student</span> who is not in the classroom to mark them <strong>Absent (Red)</strong>.
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-20">
          <button
            type="button"
            onClick={markAllPresent}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            title="Reset everyone to present"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reset All Present</span>
          </button>
          <button
            type="button"
            onClick={fetchTodayClassRoster}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer"
            title="Reload Class Roster"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="my-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submissionSuccess && (
        <div className="my-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-start justify-between gap-3 animate-fade-in shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Attendance Saved to Database!</div>
              <div className="text-emerald-300 mt-0.5">{submissionSuccess.message}</div>
            </div>
          </div>
          <button
            onClick={() => setSubmissionSuccess(null)}
            className="text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* 3D Glassmorphic Student Cards Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-xs text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <span>Synchronizing student roster from MongoDB...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 my-6">
          {students.map((student) => {
            const isAbsent = absentIds.has(student._id);

            return (
              <motion.div
                key={student._id}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleStudentStatus(student._id)}
                className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer select-none [transform-style:preserve-3d] ${
                  isAbsent
                    ? "bg-gradient-to-br from-rose-950/80 via-slate-900/90 to-rose-950/80 border-2 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.35)]"
                    : "glass-card border border-emerald-500/30 hover:border-emerald-400/60 bg-gradient-to-br from-slate-900/70 to-emerald-950/20 shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
                }`}
              >
                {/* Glow Halo */}
                <div
                  className={`absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-20 transition-opacity pointer-events-none ${
                    isAbsent ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />

                {/* Top Badge: Present vs Absent */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {student.roll}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      isAbsent
                        ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {isAbsent ? (
                      <>
                        <X className="w-2.5 h-2.5" />
                        <span>ABSENT</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-2.5 h-2.5" />
                        <span>PRESENT</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Student Photo with Ring */}
                <div className="flex items-center gap-3">
                  <div
                    className={`relative w-12 h-12 rounded-xl p-0.5 shrink-0 transition-colors ${
                      isAbsent
                        ? "bg-gradient-to-tr from-rose-500 to-orange-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                        : "bg-gradient-to-tr from-emerald-400 to-sky-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    }`}
                  >
                    {student.profilePicture ? (
                      <img
                        src={student.profilePicture}
                        alt={student.name}
                        className="w-full h-full rounded-[10px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                        {student.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                      {student.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {student.department}
                    </p>
                  </div>
                </div>

                {/* Footer Micro Tag */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <span className={isAbsent ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {isAbsent ? "Tap to Mark Present" : "Tap to Mark Absent"}
                  </span>
                  <span className="text-slate-500 font-mono">&rarr;</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Sticky Action Bar: Submit Attendance */}
      <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-20">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Users className="w-4 h-4 text-sky-400" />
          <span>
            Marked Summary: <strong className="text-emerald-400">{presentCount} Present</strong>,{" "}
            <strong className="text-rose-400">{absentCount} Absent</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmitAttendance}
          disabled={isSubmitting || isLoading || totalEnrolled === 0}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-sky-500 shadow-[0_0_30px_rgba(16,185,129,0.45)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer relative z-20"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Attendance to Database...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Attendance ({presentCount} Present, {absentCount} Absent)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

