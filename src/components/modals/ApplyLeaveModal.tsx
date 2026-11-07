"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles
} from "lucide-react";

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: string;
  department?: string;
}

export function ApplyLeaveModal({
  isOpen,
  onClose,
  onSuccess,
  userRole = "Student",
  department = "Computer Science & Engineering",
}: ApplyLeaveModalProps) {
  const [leaveType, setLeaveType] = useState<"Medical" | "On-Duty" | "Casual" | "Academic Conference">("Medical");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setErrorMessage("Please complete all required fields (dates and reason).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
          applicantRole: userRole,
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit leave application.");
      }

      setSuccessMessage(data.message || "Leave registered successfully in college ledger.");
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccessMessage(null);
        setReason("");
        setStartDate("");
        setEndDate("");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting leave.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(56,189,248,0.2)] text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">Apply for Institutional Leave</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Leave Type Select */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Leave Classification
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Medical", "On-Duty", "Casual", "Academic Conference"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLeaveType(type)}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      leaveType === type
                        ? "bg-sky-500/20 border-sky-400 text-sky-300 font-bold"
                        : "bg-slate-950/60 border-white/10 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Formal Reason / Purpose
              </label>
              <textarea
                required
                rows={3}
                placeholder="State your justification, medical conditions, or conference details..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit Sanction Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

