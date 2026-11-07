"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Calendar, 
  Clock, 
  UserCheck, 
  RefreshCw, 
  BookOpen, 
  UploadCloud,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface RoutineEntry {
  _id: string;
  dayOfWeek: string;
  timeSlot: string;
  subject: string;
  semester: number;
  department: string;
  teacherId?: {
    name?: string;
    email?: string;
  };
}

interface DepartmentRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: string;
}

export function DepartmentRoutineModal({
  isOpen,
  onClose,
  department = "Computer Science & Engineering",
}: DepartmentRoutineModalProps) {
  const [selectedSemester, setSelectedSemester] = useState(5);
  const [routines, setRoutines] = useState<RoutineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRoutines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/routine/parse?department=${encodeURIComponent(department)}&semester=${selectedSemester}`
      );
      const data = await res.json();
      if (data.success && data.routines) {
        setRoutines(data.routines);
      } else {
        setRoutines([]);
      }
    } catch (err) {
      console.error("Error loading department routines:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoutines();
    }
  }, [isOpen, selectedSemester, department]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-50 w-full max-w-4xl bg-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(59,130,246,0.2)] text-white overflow-hidden pointer-events-auto my-auto max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Department Timetable Matrix</h2>
                  <p className="text-xs text-slate-400">{department}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRoutines}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer pointer-events-auto"
                  title="Refresh Matrix"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer pointer-events-auto"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Semester Filter Tabs */}
            <div className="flex items-center gap-1.5 pb-4 overflow-x-auto shrink-0 scrollbar-none">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer pointer-events-auto ${
                    selectedSemester === sem
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Semester {sem}
                </button>
              ))}
            </div>

            {/* Timetable Grid View */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                  Syncing routine records from college timetable database...
                </div>
              ) : routines.length === 0 ? (
                <div className="p-12 rounded-2xl bg-slate-950/60 border border-white/5 text-center text-xs text-slate-400">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No routine classes uploaded for Semester {selectedSemester} in {department}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {days.map((day) => {
                    const dayClasses = routines.filter((r) => r.dayOfWeek.toLowerCase() === day.toLowerCase());
                    return (
                      <div
                        key={day}
                        className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-blue-300 border-b border-white/5 pb-1.5">
                          <span>{day}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {dayClasses.length} Lectures
                          </span>
                        </div>

                        {dayClasses.length === 0 ? (
                          <div className="py-4 text-center text-[11px] text-slate-500 italic">
                            No classes scheduled
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayClasses.map((item) => (
                              <div
                                key={item._id}
                                className="p-2.5 rounded-xl bg-slate-900 border border-white/5 space-y-1 hover:border-blue-400/30 transition-colors"
                              >
                                <div className="flex items-center justify-between text-xs font-semibold text-white">
                                  <span className="truncate max-w-[150px]">{item.subject}</span>
                                  <span className="text-[10px] font-mono text-sky-400 shrink-0">
                                    {item.timeSlot}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                  <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate">
                                    {item.teacherId?.name || "Assigned Faculty"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-400">
                Total Classes Configured: <strong className="text-white">{routines.length}</strong>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all cursor-pointer pointer-events-auto"
              >
                Close Matrix
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
