import React from "react";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";
import { 
  ShieldCheck, 
  AlertTriangle, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  QrCode
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyStudentPage({ params }: VerifyPageProps) {
  const { id } = await params;
  await connectToDatabase();

  const decodedId = decodeURIComponent(id);

  // Search by rollNumber, clerkId, or ObjectId
  const query: Record<string, unknown>[] = [
    { rollNumber: decodedId },
    { clerkId: decodedId },
  ];

  if (mongoose.Types.ObjectId.isValid(decodedId)) {
    query.push({ _id: new mongoose.Types.ObjectId(decodedId) });
  }

  const student = await User.findOne({ $or: query }).lean();

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-white text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-500/30">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">Unverified Credential</h1>
          <p className="text-xs text-slate-400 mt-2">
            No active student document found matching identification token:
          </p>
          <div className="mt-3 p-3 rounded-xl bg-slate-950 font-mono text-xs text-rose-300 border border-white/5">
            {decodedId}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">
            Security Advisory: This token may be counterfeit, expired, or purged from the institution database.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            Return to Portal
          </Link>
        </div>
      </div>
    );
  }

  // Calculate student attendance percentage
  const attendanceRecords = await Attendance.find({
    $or: [{ presentStudents: student._id }, { absentStudents: student._id }],
  }).lean();

  let attended = 0;
  let total = attendanceRecords.length;

  for (const rec of attendanceRecords) {
    const isPres = (rec.presentStudents || []).some(
      (pid: any) => pid.toString() === student._id.toString()
    );
    if (isPres) attended++;
  }

  const attendancePercentage = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 100.0;
  const isEligible = attendancePercentage >= 75.0;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="relative max-w-lg w-full rounded-3xl bg-slate-900/95 border border-emerald-500/40 p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(16,185,129,0.2)] overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Verification Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg text-slate-950 font-black text-base">
              AS
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-white block">
                AcademiaSync Verification
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
                OFFICIAL INSTITUTIONAL AUTH
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AUTHENTIC</span>
          </div>
        </div>

        {/* Student Profile Card */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/80 border border-white/10 mb-6">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-xl shrink-0 bg-slate-800">
            {student.profilePicture ? (
              <Image
                src={student.profilePicture}
                alt={student.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-emerald-300">
                {student.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="text-center sm:text-left min-w-0 flex-1">
            <h2 className="text-xl font-black text-white truncate">{student.name}</h2>
            <div className="mt-1 font-mono text-xs font-bold text-sky-400 tracking-wider">
              ROLL: {student.rollNumber || "2023-CS-000"}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {student.department || "Computer Science & Engineering"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Semester {student.semester || 1} &bull; Section {student.section || "A"} &bull; {student.sessionYear || "2024-2025"}
            </div>
          </div>
        </div>

        {/* Attendance Compliance & Examination Eligibility */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              Overall Attendance
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {attendancePercentage}%
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {attended} / {total} classes attended
            </span>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isEligible
              ? "bg-emerald-950/40 border-emerald-500/30"
              : "bg-rose-950/40 border-rose-500/30"
          }`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
              Exam Hall Status
            </span>
            <div className={`text-sm font-black mt-1.5 flex items-center gap-1.5 ${
              isEligible ? "text-emerald-400" : "text-rose-400"
            }`}>
              {isEligible ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>HALL TICKET VALID</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>WITHHELD (&lt;75%)</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {isEligible ? "Eligible for final exams" : "Requires HOD clearance"}
            </span>
          </div>
        </div>

        {/* Digital Verification Ledger Sign-off */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Verification Timestamp:</span>
            <span className="font-mono text-slate-300">{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Institutional Node:</span>
            <span className="font-mono text-slate-300">ACADEMIA-SYNC-WEST-BENGAL-01</span>
          </div>
          <div className="flex justify-between">
            <span>Biometric Signature:</span>
            <span className="font-mono text-emerald-400 truncate max-w-[150px]">
              {student._id.toString().toUpperCase()}
            </span>
          </div>
        </div>

        {/* Return to Portal */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>&larr; Institutional Portal Gateway</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

