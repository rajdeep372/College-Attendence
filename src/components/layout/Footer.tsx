import React from "react";
import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-sky-500/20 bg-slate-950/80 backdrop-blur-xl py-12 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span>AcademiaSync</span>
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xs text-slate-400">
              Next-Gen College Management & Smart Attendance OS
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <Link href="/dashboard/principal" className="hover:text-sky-300 transition-colors">
            Principal Portal
          </Link>
          <Link href="/dashboard/hod" className="hover:text-sky-300 transition-colors">
            HOD Portal
          </Link>
          <Link href="/dashboard/teacher" className="hover:text-sky-300 transition-colors">
            Teacher Portal
          </Link>
          <Link href="/dashboard/student" className="hover:text-sky-300 transition-colors">
            Student Portal
          </Link>
        </div>

        <div className="text-xs text-slate-500">
          Built with Next.js App Router, Tailwind CSS, Clerk & Framer Motion
        </div>
      </div>
    </footer>
  );
}

