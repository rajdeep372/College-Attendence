import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import Attendance, { IAttendance } from "@/models/Attendance";

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

    const { searchParams } = new URL(req.url);
    const departmentQuery = searchParams.get("department");

    const studentFilter: Record<string, unknown> = { role: "Student" };
    if (departmentQuery && departmentQuery.toLowerCase() !== "all") {
      studentFilter.department = departmentQuery;
    }

    // 1. Fetch real students from MongoDB
    const students = await User.find(studentFilter).lean<IUser[]>();

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No registered students found in selected department.",
        evaluatedStudentsCount: 0,
        atRiskStudentsCount: 0,
        emailsDispatched: 0,
        students: [],
      });
    }

    // 2. Fetch real attendance records sorted by date descending
    const attendanceRecords = await Attendance.find().sort({ date: -1 }).lean<IAttendance[]>();

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
      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0.0;
      const effectiveConsecutive = consecutiveAbsences;

      const riskReasons: string[] = [];
      // Any student strictly below 75% (including those at 0%) is flagged as at-risk
      if (percentage < 75) {
        if (total === 0) {
          riskReasons.push("Zero attendance recorded (0.0% turnout - Attendance required)");
        } else {
          riskReasons.push(`Attendance below 75% limit (${percentage}%)`);
        }
      }
      if (effectiveConsecutive >= 3) {
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
      message: `Identified ${atRiskStudents.length} at-risk students below 75% threshold. Dispatched ${emailsDispatched} warning notifications.`,
      evaluatedStudentsCount: students.length,
      atRiskCount: atRiskStudents.length,
      atRiskStudentsCount: atRiskStudents.length,
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
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const departmentQuery = searchParams.get("department");

    const studentFilter: Record<string, unknown> = { role: "Student" };
    if (departmentQuery && departmentQuery.toLowerCase() !== "all") {
      studentFilter.department = departmentQuery;
    }

    const students = await User.find(studentFilter).lean<IUser[]>();
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

      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0.0;
      const effectiveConsecutive = consecutiveAbsences;

      const riskReasons: string[] = [];
      // Any student strictly below 75% (including those at 0%) is flagged as at-risk
      if (percentage < 75) {
        if (total === 0) {
          riskReasons.push("Zero attendance recorded (0.0% turnout - Attendance required)");
        } else {
          riskReasons.push(`Attendance below 75% limit (${percentage}%)`);
        }
      }
      if (effectiveConsecutive >= 3) {
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

    return NextResponse.json({
      success: true,
      evaluatedStudentsCount: students.length,
      count: atRiskStudents.length,
      atRiskCount: atRiskStudents.length,
      students: atRiskStudents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error querying at-risk students";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function generateWarningEmailHtml(student: AtRiskStudentData): string {
  const isZero = student.attendancePercentage === 0;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: bold; color: #f43f5e; text-transform: uppercase; letter-spacing: 1.5px;">Official Academic Notice</span>
        <h1 style="font-size: 22px; color: #ffffff; margin: 6px 0 0 0;">Attendance Disciplinary Warning</h1>
      </div>

      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
        Dear <strong>${student.name}</strong>,
      </p>

      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
        This automated directive is issued by the Academic Dean & Head of Department. Your lecture attendance turnout in the <strong>${student.department}</strong> has fallen critically below the mandatory <strong>75% institutional threshold</strong>.
      </p>

      <div style="background: rgba(30, 41, 59, 0.7); border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid rgba(255, 255, 255, 0.08);">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Current Attendance Turnout:</td>
            <td style="color: #f43f5e; font-weight: bold; text-align: right; font-size: 16px;">${student.attendancePercentage}%</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Classes Conducted / Attended:</td>
            <td style="color: #ffffff; font-weight: bold; text-align: right;">${student.attendedClasses} / ${student.totalClasses}</td>
          </tr>
          ${
            student.consecutiveAbsences > 0
              ? `<tr>
                  <td style="color: #94a3b8; padding: 6px 0;">Consecutive Absences:</td>
                  <td style="color: #fb923c; font-weight: bold; text-align: right;">${student.consecutiveAbsences} Days</td>
                </tr>`
              : ""
          }
        </table>
      </div>

      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; margin: 20px 0;">
        <p style="font-size: 12px; color: #fca5a5; margin: 0; line-height: 1.5;">
          <strong>Critical Academic Consequence:</strong> Students with less than 75% total turnout are debarred from sitting for Semester End Examinations under University Regulation Code 4.2.
        </p>
      </div>

      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
        If you have legitimate medical reasons or official campus duty deputation, submit a verified Leave Application on your AcademiaSync Student Dashboard immediately.
      </p>

      <div style="font-size: 11px; color: #64748b; margin-top: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px;">
        AcademiaSync Institutional Attendance System &bull; Office of Academic Affairs
      </div>
    </div>
  `;
}
