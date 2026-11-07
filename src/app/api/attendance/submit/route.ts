import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import mongoose from "mongoose";
import { currentUser } from "@clerk/nextjs/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      routineId, 
      subject,
      timeSlot,
      teacherName: bodyTeacherName,
      academicYear,
      department: bodyDept,
      semester: bodySemester,
      section: bodySection,
      presentStudents = [], 
      absentStudents = [], 
      markedBy, 
      date 
    } = body;

    // Resolve teacher marking attendance
    let teacherId = markedBy;
    let resolvedTeacherName = bodyTeacherName || "Faculty Instructor";
    let resolvedDept = bodyDept;

    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const dbTeacher = await User.findOne({ clerkId: clerkUser.id });
        if (dbTeacher) {
          teacherId = dbTeacher._id;
          resolvedTeacherName = dbTeacher.name || resolvedTeacherName;
          resolvedDept = resolvedDept || dbTeacher.department;
        }
      }
    } catch {
      // Dev mode fallback
    }

    if (!teacherId) {
      const defaultTeacher = await User.findOne({ role: { $in: ["Teacher", "HOD", "Principal"] } });
      teacherId = defaultTeacher?._id || new mongoose.Types.ObjectId();
      resolvedTeacherName = defaultTeacher?.name || resolvedTeacherName;
      resolvedDept = resolvedDept || defaultTeacher?.department;
    }

    // Resolve Routine if routineId is provided
    let routineDoc = null;
    if (routineId && mongoose.Types.ObjectId.isValid(routineId)) {
      routineDoc = await Routine.findById(routineId).lean();
    }

    const finalSubject = subject || routineDoc?.subject || "Core Curriculum Lecture";
    const finalTimeSlot = timeSlot || routineDoc?.timeSlot || `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const finalDepartment = resolvedDept || routineDoc?.department || "General Academic & Sciences";
    const finalSemester = Number(bodySemester) || routineDoc?.semester || 1;
    const finalSection = bodySection || routineDoc?.section || "Section A";
    const finalAcademicYear = academicYear || routineDoc?.academicYear || (
      finalSemester <= 2 ? "1st Year" :
      finalSemester <= 4 ? "2nd Year" :
      finalSemester <= 6 ? "3rd Year" : "4th Year"
    );
    const sessionDate = date ? new Date(date) : new Date();

    // Clean up student IDs
    const validPresentIds = presentStudents
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const validAbsentIds = absentStudents
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    // Save attendance record to MongoDB with full metadata
    const attendanceRecord = await Attendance.create({
      date: sessionDate,
      timeSlot: finalTimeSlot,
      teacherName: resolvedTeacherName,
      subject: finalSubject,
      academicYear: finalAcademicYear,
      department: finalDepartment,
      semester: finalSemester,
      section: finalSection,
      routineId: routineDoc?._id || undefined,
      presentStudents: validPresentIds,
      absentStudents: validAbsentIds,
      markedBy: teacherId,
    });

    console.log(`[Attendance API] Saved attendance record ${attendanceRecord._id}. Present: ${validPresentIds.length}, Absent: ${validAbsentIds.length}`);

    // Instant Notification Dispatch:
    // Notify absent and present students of their recorded turnout and updated attendance percentage
    let notificationsSent = 0;
    try {
      const allStudentIds = [...validAbsentIds, ...validPresentIds];
      const studentsToNotify = await User.find({ _id: { $in: allStudentIds } }).lean();

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT) || 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || `"AcademiaSync Institutional Portal" <noreply@academiasync.edu>`;

      const isSmtpConfigured = smtpUser && smtpPass && !smtpPass.includes("placeholder");

      if (isSmtpConfigured && studentsToNotify.length > 0) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        // Compute updated attendance stats for these students
        for (const st of studentsToNotify) {
          if (!st.email) continue;

          const isAbsent = validAbsentIds.some((id: mongoose.Types.ObjectId) => id.toString() === st._id.toString());
          const statusText = isAbsent ? "ABSENT" : "PRESENT";
          const statusColor = isAbsent ? "#ef4444" : "#10b981";

          // Calculate student's overall attendance percentage
          const studentRecords = await Attendance.find({
            $or: [{ presentStudents: st._id }, { absentStudents: st._id }],
          }).lean();

          let attended = 0;
          let total = studentRecords.length;
          for (const rec of studentRecords) {
            if (rec.presentStudents.some((id) => id.toString() === st._id.toString())) {
              attended++;
            }
          }

          const currentPct = total > 0 ? ((attended / total) * 100).toFixed(1) : (isAbsent ? "0.0" : "100.0");

          await transporter.sendMail({
            from: smtpFrom,
            to: st.email,
            subject: `[Attendance Alert] Marked ${statusText}: ${finalSubject} (${sessionDate.toLocaleDateString()})`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(56,189,248,0.3);">
                <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">
                  <span style="font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">AcademiaSync Attendance Ledger</span>
                  <h2 style="font-size: 20px; color: #ffffff; margin: 4px 0 0 0;">Class Attendance Notification</h2>
                </div>

                <p style="font-size: 14px; color: #cbd5e1;">Dear <strong>${st.name}</strong> (${st.rollNumber || "Student"}),</p>

                <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                  Your lecture attendance for <strong>${finalSubject}</strong> on <strong>${sessionDate.toLocaleDateString()}</strong> at <strong>${finalTimeSlot}</strong> has been logged by <strong>${resolvedTeacherName}</strong>.
                </p>

                <div style="background: rgba(30,41,59,0.7); border-radius: 12px; padding: 16px; margin: 18px 0; display: flex; justify-content: space-around; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Session Status</div>
                    <div style="font-size: 18px; font-weight: 800; color: ${statusColor}; margin-top: 4px;">${statusText}</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Updated Total Turnout</div>
                    <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${currentPct}%</div>
                  </div>
                </div>

                ${
                  isAbsent
                    ? `<div style="background: rgba(239,68,68,0.15); border-left: 4px solid #ef4444; padding: 10px; border-radius: 6px; font-size: 12px; color: #fca5a5;">
                        You have been marked absent. If this was a mistake or authorized on-duty absence, submit a leave application on your student portal immediately.
                      </div>`
                    : ""
                }

                <div style="font-size: 11px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                  AcademiaSync Smart Campus Biometric Ledger &bull; Department of ${finalDepartment}
                </div>
              </div>
            `,
          });
          notificationsSent++;
        }
      }
    } catch (notifyErr) {
      console.warn("[Attendance Submit] Instant notification dispatch note:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: `Attendance submitted to MongoDB! ${validPresentIds.length} Present, ${validAbsentIds.length} Absent recorded. ${notificationsSent} student notifications sent.`,
      attendanceId: attendanceRecord._id.toString(),
      presentCount: validPresentIds.length,
      absentCount: validAbsentIds.length,
      totalStudents: validPresentIds.length + validAbsentIds.length,
      notificationsSent,
      record: attendanceRecord,
    });
  } catch (error: unknown) {
    console.error("[API: /api/attendance/submit] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to record attendance";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
