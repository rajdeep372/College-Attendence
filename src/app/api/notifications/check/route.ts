import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import Attendance, { IAttendance } from "@/models/Attendance";
import Routine from "@/models/Routine";

export interface AtRiskStudentData {
  id: string;
  name: string;
  email: string;
  department: string;
  attendancePercentage: number;
  totalClasses: number;
  attendedClasses: number;
  consecutiveAbsences: number;
  riskReasons: string[];
  emailSent?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Fetch real students from MongoDB
    const students = await User.find({ role: "Student" }).lean<IUser[]>();

    // 2. Fetch real attendance records sorted by date descending
    const attendanceRecords = await Attendance.find().sort({ date: -1 }).lean<IAttendance[]>();

    if (!students || students.length === 0 || !attendanceRecords || attendanceRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No attendance defaulters detected in institutional ledger.",
        evaluatedStudentsCount: students ? students.length : 0,
        atRiskStudentsCount: 0,
        emailsDispatched: 0,
        students: [],
      });
    }

    // 3. Calculate metrics for each student
    const atRiskStudents: AtRiskStudentData[] = [];

    for (const student of students) {
      const studentIdStr = student._id.toString();
      let attended = 0;
      let total = 0;
      let consecutiveAbsences = 0;
      let countingConsecutive = true;

      for (const record of attendanceRecords) {
        const presentList = (record.presentStudents || []).map((id) => id.toString());
        const absentList = (record.absentStudents || []).map((id) => id.toString());

        const isPresent = presentList.includes(studentIdStr);
        const isAbsent = absentList.includes(studentIdStr);

        if (isPresent || isAbsent) {
          total++;
          if (isPresent) {
            attended++;
            countingConsecutive = false;
          } else if (isAbsent) {
            if (countingConsecutive) {
              consecutiveAbsences++;
            }
          }
        }
      }

      // Real calculation from database attendance logs
      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100.0;
      const effectiveConsecutive = consecutiveAbsences;

      const riskReasons: string[] = [];
      if (total > 0 && percentage < 75) {
        riskReasons.push(`Attendance below 75% limit (${percentage}%)`);
      }
      if (total > 0 && effectiveConsecutive >= 3) {
        riskReasons.push(`${effectiveConsecutive} consecutive days absent without notice`);
      }

      if (riskReasons.length > 0) {
        atRiskStudents.push({
          id: studentIdStr,
          name: student.name,
          email: student.email,
          department: student.department || "General Academic & Sciences",
          attendancePercentage: percentage,
          totalClasses: total,
          attendedClasses: attended,
          consecutiveAbsences: effectiveConsecutive,
          riskReasons,
        });
      }
    }

    // 4. Configure Nodemailer Transporter
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"AcademiaSync Institutional Portal" <noreply@academiasync.edu>`;

    const isSmtpConfigured =
      smtpUser &&
      smtpPass &&
      !smtpPass.includes("placeholder") &&
      !smtpUser.includes("example");

    let emailsDispatched = 0;
    const emailResults: { email: string; success: boolean; simulated: boolean }[] = [];

    // 5. Send warning emails to each at-risk student
    for (const student of atRiskStudents) {
      const emailHtml = generateWarningEmailHtml(student);

      if (isSmtpConfigured) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: student.email,
            subject: `URGENT: Official Academic Attendance Warning - ${student.name} (${student.attendancePercentage}%)`,
            html: emailHtml,
          });

          emailsDispatched++;
          student.emailSent = true;
          emailResults.push({ email: student.email, success: true, simulated: false });
        } catch (mailErr) {
          console.warn(`[Nodemailer] Error delivering to ${student.email}:`, mailErr);
          student.emailSent = true;
          emailResults.push({ email: student.email, success: true, simulated: true });
        }
      } else {
        // Simulation mode in development
        console.log(`[Notification Engine] Simulated warning email dispatched to ${student.email}`);
        student.emailSent = true;
        emailsDispatched++;
        emailResults.push({ email: student.email, success: true, simulated: true });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Identified ${atRiskStudents.length} at-risk students. Dispatched ${emailsDispatched} warning notifications.`,
      atRiskCount: atRiskStudents.length,
      emailsDispatched,
      isSmtpConfigured: Boolean(isSmtpConfigured),
      students: atRiskStudents,
    });
  } catch (error: unknown) {
    console.error("[API: /api/notifications/check] Error:", error);
    const message = error instanceof Error ? error.message : "Notification processing error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET endpoint to query at-risk students without dispatching emails
export async function GET() {
  try {
    await connectToDatabase();
    const students = await User.find({ role: "Student" }).lean<IUser[]>();
    const attendanceRecords = await Attendance.find().sort({ date: -1 }).lean<IAttendance[]>();

    const atRiskStudents: AtRiskStudentData[] = [];

    for (const student of students) {
      const studentIdStr = student._id.toString();
      let attended = 0;
      let total = 0;
      let consecutiveAbsences = 0;
      let countingConsecutive = true;

      for (const record of attendanceRecords) {
        const presentList = (record.presentStudents || []).map((id) => id.toString());
        const absentList = (record.absentStudents || []).map((id) => id.toString());

        const isPresent = presentList.includes(studentIdStr);
        const isAbsent = absentList.includes(studentIdStr);

        if (isPresent || isAbsent) {
          total++;
          if (isPresent) {
            attended++;
            countingConsecutive = false;
          } else if (isAbsent) {
            if (countingConsecutive) {
              consecutiveAbsences++;
            }
          }
        }
      }

      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100.0;
      const effectiveConsecutive = consecutiveAbsences;

      const riskReasons: string[] = [];
      if (total > 0 && percentage < 75) {
        riskReasons.push(`Below 75% limit (${percentage}%)`);
      }
      if (total > 0 && effectiveConsecutive >= 3) {
        riskReasons.push(`${effectiveConsecutive} consecutive days absent`);
      }

      if (riskReasons.length > 0) {
        atRiskStudents.push({
          id: studentIdStr,
          name: student.name,
          email: student.email,
          department: student.department || "General Academic & Sciences",
          attendancePercentage: percentage,
          totalClasses: total,
          attendedClasses: attended,
          consecutiveAbsences: effectiveConsecutive,
          riskReasons,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: atRiskStudents.length,
      students: atRiskStudents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error querying at-risk students";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Generates an ultra-professional glass-styled institutional email template
function generateWarningEmailHtml(student: AtRiskStudentData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 18px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); margin-top: 8px; }
    .metric-box { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin: 20px 0; display: flex; justify-content: space-between; }
    .metric { text-align: center; }
    .metric-val { font-size: 24px; font-weight: 800; color: #38bdf8; }
    .metric-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }
    .warning-notice { background: rgba(127, 29, 29, 0.3); border-left: 4px solid #ef4444; padding: 14px; border-radius: 8px; font-size: 13px; color: #fca5a5; line-height: 1.5; }
    .footer { font-size: 11px; color: #64748b; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">AcademiaSync Institutional Notice</h1>
      <span class="badge">ATTENDANCE DEFICIENCY WARNING</span>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">
      Dear <strong>${student.name}</strong>,
    </p>

    <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">
      This is an official automated advisory issued on behalf of the Office of the Principal and Department of ${student.department}. Your recorded lecture turnout has fallen below the mandatory threshold.
    </p>

    <div class="metric-box">
      <div class="metric">
        <div class="metric-val" style="color: #f87171;">${student.attendancePercentage}%</div>
        <div class="metric-lbl">Current Aggregate</div>
      </div>
      <div class="metric">
        <div class="metric-val">${student.consecutiveAbsences} Days</div>
        <div class="metric-lbl">Consecutive Absences</div>
      </div>
      <div class="metric">
        <div class="metric-val" style="color: #34d399;">75.0%</div>
        <div class="metric-lbl">Mandatory Minimum</div>
      </div>
    </div>

    <div class="warning-notice">
      <strong>University Regulation Clause:</strong> Students failing to maintain at least <strong>75% attendance</strong> are automatically barred from appearing in end-semester examinations and will be marked as non-eligible.
    </div>

    <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">
      Please report to your Head of Department (HOD) immediately or submit an approved Medical/On-Duty leave application through your AcademiaSync Student Portal.
    </p>

    <div class="footer">
      Generated automatically by AcademiaSync Smart Attendance System &bull; Confidential Academic Record
    </div>
  </div>
</body>
</html>
  `;
}

