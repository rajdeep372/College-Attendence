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

  if (!isOpen) return null;

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(37,99,235,0.25)] text-white flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white">Department Timetable Schedule</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{department}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchRoutines}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-all cursor-pointer"
                title="Refresh Schedule"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Semester Selector Filter */}
          <div className="py-3 flex items-center justify-between border-b border-white/5 shrink-0 text-xs">
            <span className="text-slate-400 font-medium">Filter by Semester:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedSemester === sem
                      ? "bg-sky-500 text-slate-950 font-bold shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule List Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs">Querying MongoDB Routine collection...</span>
              </div>
            ) : routines.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-white/5 text-center text-xs text-slate-400 space-y-2">
                <p>No lectures registered yet for Semester {selectedSemester} in {department}.</p>
                <p className="text-[11px] text-sky-300">
                  Use the &quot;AI Routine Upload&quot; dropzone on your HOD dashboard to scan an official timetable image with Gemini Vision AI.
                </p>
              </div>
            ) : (
              days.map((day) => {
                const dayRoutines = routines.filter((r) => r.dayOfWeek.toLowerCase() === day.toLowerCase());
                if (dayRoutines.length === 0) return null;

                return (
                  <div key={day} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2.5 pb-1 border-b border-white/5">
                      {day}
                    </h3>
                    <div className="space-y-2">
                      {dayRoutines.map((item) => (
                        <div
                          key={item._id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{item.subject}</span>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-sky-400" />
                                <span>{item.timeSlot}</span>
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-300">
                                Instructor: {item.teacherId?.name || "Department Faculty"}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-800 self-start sm:self-auto">
                            Sem {item.semester}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-400 text-[11px]">
              Timetables parsed automatically via Google Gemini AI
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

