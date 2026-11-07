"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Megaphone,
  BellRing
} from "lucide-react";

interface BroadcastCircularModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  authorRole?: string;
  department?: string;
}

export function BroadcastCircularModal({
  isOpen,
  onClose,
  onSuccess,
  authorRole = "Principal",
  department = "Executive Leadership",
}: BroadcastCircularModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"Academic" | "Examination" | "Emergency" | "General">("General");
  const [targetAudience, setTargetAudience] = useState<"All" | "Faculty" | "Students" | "HODs">("All");
  const [important, setImportant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMessage("Please fill in both the circular headline and notice body.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          targetAudience,
          important,
          authorRole,
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to broadcast campus circular.");
      }

      setSuccessMessage(data.message || "Circular broadcast dispatched across institutional channels.");
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccessMessage(null);
        setTitle("");
        setContent("");
        setImportant(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error dispatching circular.";
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
          className="relative w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Broadcast Campus Circular</h2>
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
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Circular Headline / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Mid-Term Examination Attendance Cutoff Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="General">General Administrative</option>
                  <option value="Academic">Academic Schedule</option>
                  <option value="Examination">Examination & Audit</option>
                  <option value="Emergency">Emergency Directive</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="All">All Campus Members</option>
                  <option value="Students">Scholars & Students</option>
                  <option value="Faculty">Faculty & Instructors</option>
                  <option value="HODs">Department Heads Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Notice Text Body
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write the full institutional directive, directives, and required compliance instructions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="urgent-check"
                checked={important}
                onChange={(e) => setImportant(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-white/20 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="urgent-check" className="text-slate-300 font-medium cursor-pointer">
                Pin as High-Priority Notice (Highlights in red across student portals)
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Broadcast Now</span>
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

