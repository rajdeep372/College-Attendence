"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  AlertTriangle, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  Users 
} from "lucide-react";

interface ParentAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: string;
  defaulters?: Array<{
    name: string;
    roll: string;
    email?: string;
    percentage: string;
    absences: number;
  }>;
}

export function ParentAdvisoryModal({
  isOpen,
  onClose,
  department = "Computer Science & Engineering",
  defaulters = [],
}: ParentAdvisoryModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState(
    "Formal attendance warning: Student has fallen below the mandatory 75% threshold. Examination hall tickets will be withheld if attendance is not improved immediately."
  );

  const handleDispatch = async () => {
    setIsSending(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/notifications/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNote, department }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch notices.");
      }

      setMessage(data.message || `Dispatched attendance advisory warnings to registered guardians.`);
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending parent warnings.";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

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
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl dark:shadow-[0_0_50px_rgba(245,158,11,0.2)] text-slate-900 dark:text-white overflow-hidden pointer-events-auto my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Parent / Guardian Attendance Advisory</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{department}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-all cursor-pointer pointer-events-auto"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Defaulter Count Highlight */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">Target Cohort</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {defaulters.length} Defaulters Identified (&lt;75%)
                </span>
              </div>

              {/* Custom Directive Input */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Official Advisory Message (Delivered via Nodemailer)
                </label>
                <textarea
                  rows={4}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Enter notice text dispatched to registered parents..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 text-xs resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-all cursor-pointer pointer-events-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/20 transition-all cursor-pointer pointer-events-auto flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Notices...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Advisory</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
