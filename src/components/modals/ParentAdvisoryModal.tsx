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

  if (!isOpen) return null;

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

      setMessage(
        data.message ||
          `Official parent advisory warnings dispatched to ${data.warningsSent || defaulters.length || "at-risk"} student guardians via email.`
      );

      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error dispatching advisory notices.";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white">Parent Advisory & Warning Dispatch</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Target Department & Program</span>
              <div className="font-semibold text-white px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10">
                {department}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Identified Defaulter Scholars</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950/80 border border-white/10">
                {defaulters.length > 0 ? (
                  defaulters.map((st, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-900 border border-rose-500/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white">{st.name}</span>
                        <span className="text-slate-400 text-[10px] ml-2">({st.roll})</span>
                      </div>
                      <span className="text-rose-400 font-bold">{st.percentage}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-center py-2">
                    Automated scan will evaluate all enrolled students below 75% attendance.
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Official Advisory Warning Message
              </label>
              <textarea
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
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
                type="button"
                onClick={handleDispatch}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Dispatch Notices</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

