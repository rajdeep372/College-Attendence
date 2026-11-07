"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Send, 
  Mail, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  UserX,
  TrendingDown,
  Sparkles
} from "lucide-react";
import { AtRiskStudentData } from "@/app/api/notifications/check/route";

export function AtRiskStudentsCard({ department }: { department?: string } = {}) {
  const [students, setStudents] = useState<AtRiskStudentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initial fetch of at-risk students
  useEffect(() => {
    fetchAtRiskList();
  }, [department]);

  const fetchAtRiskList = async () => {
    try {
      const url = department
        ? `/api/notifications/check?department=${encodeURIComponent(department)}`
        : "/api/notifications/check";
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (data.success && data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.warn("Failed to query at-risk students:", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleTriggerNotifications = async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/notifications/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to trigger notifications");
      }

      setStudents(data.students || []);
      setFeedback({
        type: "success",
        message: data.message || `Dispatched ${data.emailsDispatched} warning notices via Nodemailer.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing notification check";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative p-6 sm:p-7 rounded-3xl glass-card border border-rose-500/25 shadow-[0_15px_40px_rgba(244,63,94,0.12)] overflow-hidden">
      {/* Background Neon Accent */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 border border-rose-500/30 text-rose-400 shadow-md">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                At-Risk Students & Automated Disciplinary Warnings
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {students.length} Flagged
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated triggers send official Nodemailer notices to students with &lt;75% attendance or &ge;3 consecutive absences.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleTriggerNotifications}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-orange-600 hover:from-rose-400 hover:to-orange-500 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing & Dispatching...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Trigger Warning Check</span>
            </>
          )}
        </button>
      </div>

      {/* Notification Feedback Toast */}
      {feedback && (
        <div
          className={`mb-5 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/50 border border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Table or Empty State */}
      {isInitialLoading ? (
        <div className="py-8 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span>Auditing student attendance registers...</span>
        </div>
      ) : students.length === 0 ? (
        <div className="py-8 text-center text-xs text-emerald-400 bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
          <span>Excellent! Zero students are currently below the 75% threshold or consecutively absent.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/80 border-b border-white/10">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Attendance Rate</th>
                <th className="px-4 py-3">Consecutive Absences</th>
                <th className="px-4 py-3">Risk Diagnosis</th>
                <th className="px-4 py-3 text-right">Email Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{student.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{student.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {student.department}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-rose-400 font-mono">
                        {student.attendancePercentage}%
                      </span>
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(student.attendancePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    <span className="px-2 py-0.5 rounded-md font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30">
                      {student.consecutiveAbsences} Days
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {student.riskReasons.map((reason, idx) => (
                        <div key={idx} className="text-[10px] text-rose-300 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-rose-400" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {student.emailSent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Warning Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                        <Mail className="w-3 h-3" />
                        <span>Pending Check</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

