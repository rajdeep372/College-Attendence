import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { standardizeDepartment, getDepartmentVariants } from "@/lib/departments";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSessionDate(dateVal: Date | string): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Invalid Date";
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function formatFullDate(dateVal: Date | string): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Unknown Date";
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

async function handleExport(req: NextRequest) {
  try {
    await connectToDatabase();

    let sessionId: string | null = null;
    let mode: string | null = null;
    let routineId: string | null = null;
    let subjectId: string | null = null;
    let subject: string | null = null;
    let department: string | null = null;
    let academicYear: string | null = null;
    let semester: string | null = null;
    let section: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        sessionId = body.sessionId || null;
        mode = body.mode || null;
        routineId = body.routineId || null;
        subjectId = body.subjectId || null;
        subject = body.subject || null;
        department = body.department || null;
        academicYear = body.academicYear || null;
        semester = body.semester ? String(body.semester) : null;
        section = body.section || null;
      } catch {
        // Fallback to URL searchParams
      }
    }

    const { searchParams } = new URL(req.url);
    if (!sessionId) sessionId = searchParams.get("sessionId");
    if (!mode) mode = searchParams.get("mode");
    if (!routineId) routineId = searchParams.get("routineId");
    if (!subjectId) subjectId = searchParams.get("subjectId");
    if (!subject) subject = searchParams.get("subject");
    if (!department) department = searchParams.get("department");
    if (!academicYear) academicYear = searchParams.get("academicYear");
    if (!semester) semester = searchParams.get("semester");
    if (!section) section = searchParams.get("section");

    // =========================================================================
    // FEATURE 2: SINGLE-DAY SESSION EXPORT
    // Triggered when sessionId is provided or mode === "day"
    // Shows: Roll No, Name, and Status (Present/Absent)
    // =========================================================================
    if (sessionId || mode === "day") {
      let sessionDoc: any = null;
      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        sessionDoc = await Attendance.findById(sessionId)
          .populate("presentStudents", "_id name rollNumber email")
          .populate("absentStudents", "_id name rollNumber email")
          .populate("markedBy", "name email")
          .lean();
      }

      if (!sessionDoc) {
        const dayQuery: Record<string, unknown> = {};
        if (department && department !== "all") {
          dayQuery.department = { $in: getDepartmentVariants(department) };
        }
        if (semester && semester !== "all") {
          dayQuery.semester = parseInt(semester, 10);
        }
        if (section && section !== "all") {
          dayQuery.section = section;
        }
        if (subject && subject !== "all") {
          dayQuery.subject = new RegExp(escapeRegex(subject.trim()), "i");
        }
        sessionDoc = await Attendance.findOne(dayQuery)
          .sort({ date: -1 })
          .populate("presentStudents", "_id name rollNumber email")
          .populate("absentStudents", "_id name rollNumber email")
          .populate("markedBy", "name email")
          .lean();
      }

      if (!sessionDoc) {
        return NextResponse.json(
          { success: false, error: "No attendance session found for single-day export" },
          { status: 404 }
        );
      }

      const sessionSubject = sessionDoc.subject || "Class_Session";
      const sessionDateStr = formatFullDate(sessionDoc.date || new Date());
      const sessionTimeSlot = sessionDoc.timeSlot || "Scheduled Slot";
      const sessionDept = sessionDoc.department || department || "General";
      const sessionSem = sessionDoc.semester || semester || 1;
      const sessionSec = sessionDoc.section || section || "Section A";

      const presentMap = new Map<string, any>();
      for (const p of sessionDoc.presentStudents || []) {
        if (p && p._id) presentMap.set(p._id.toString(), p);
      }

      const absentMap = new Map<string, any>();
      for (const a of sessionDoc.absentStudents || []) {
        if (a && a._id) absentMap.set(a._id.toString(), a);
      }

      const cohortQuery: Record<string, unknown> = {
        role: "Student",
        department: { $in: getDepartmentVariants(sessionDept) },
        semester: sessionSem,
      };
      if (sessionSec && sessionSec !== "all" && sessionSec !== "All") {
        cohortQuery.section = sessionSec;
      }

      const cohortStudents = await User.find(cohortQuery)
        .select("_id name rollNumber email")
        .lean();

      const allStudentMap = new Map<string, any>();
      for (const st of cohortStudents) {
        allStudentMap.set((st as any)._id.toString(), st);
      }
      for (const [id, p] of presentMap.entries()) {
        if (!allStudentMap.has(id)) allStudentMap.set(id, p);
      }
      for (const [id, a] of absentMap.entries()) {
        if (!allStudentMap.has(id)) allStudentMap.set(id, a);
      }

      const sortedStudents = Array.from(allStudentMap.values()).sort((a, b) => {
        const rollA = a.rollNumber || "";
        const rollB = b.rollNumber || "";
        if (rollA && rollB) return rollA.localeCompare(rollB, undefined, { numeric: true });
        return (a.name || "").localeCompare(b.name || "");
      });

      const dayDataRows: Record<string, string | number>[] = [];

      if (sortedStudents.length === 0) {
        dayDataRows.push({
          "Roll No": "N/A",
          "Name": "No registered students found for this session",
          "Status": "N/A",
          "Subject": sessionSubject,
          "Date": sessionDateStr,
          "Time Slot": sessionTimeSlot,
          "Department": sessionDept,
          "Semester": sessionSem,
          "Section": sessionSec,
        });
      } else {
        for (const st of sortedStudents) {
          const stId = st._id.toString();
          const isPresent = presentMap.has(stId);
          dayDataRows.push({
            "Roll No": st.rollNumber || "N/A",
            "Name": st.name || "Student",
            "Status": isPresent ? "Present" : "Absent",
            "Subject": sessionSubject,
            "Date": sessionDateStr,
            "Time Slot": sessionTimeSlot,
            "Department": sessionDept,
            "Semester": sessionSem,
            "Section": sessionSec,
          });
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(dayDataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Day Attendance");

      const cols = Object.keys(dayDataRows[0] || {}).map((key) => ({
        wch: Math.max(key.length, 14),
      }));
      worksheet["!cols"] = cols;

      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const cleanSubject = sessionSubject.replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanDate = sessionDateStr.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${cleanSubject}_${cleanDate}_Day_Report.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // =========================================================================
    // FEATURE 3: SEMESTER-END MASTER MATRIX EXPORT (Critical)
    // Structure:
    // Rows: Individual Students (Roll No, Student Name)
    // Dynamic Columns: Every Date a class was held (Nov 01, Nov 03, Nov 08...)
    // Cells: 'P' or 'A' mapped automatically
    // Final Columns: 'Total Classes Held', 'Classes Attended', 'Overall Percentage %'
    // =========================================================================

    let routineDoc: any = null;
    if (routineId && mongoose.Types.ObjectId.isValid(routineId)) {
      routineDoc = await Routine.findById(routineId).lean();
    }
    if (!routineDoc && subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      routineDoc = await Routine.findOne({
        $or: [{ _id: subjectId }, { "classes._id": subjectId }],
      }).lean();
    }

    let matchedClass: any = null;
    if (routineDoc && Array.isArray(routineDoc.classes)) {
      if (subjectId) {
        matchedClass = routineDoc.classes.find(
          (c: any) => c._id?.toString() === subjectId || c.subject === subjectId
        );
      }
      if (!matchedClass && subject) {
        matchedClass = routineDoc.classes.find(
          (c: any) => c.subject?.toLowerCase() === subject?.toLowerCase()
        );
      }
      if (!matchedClass && routineDoc.classes.length > 0) {
        matchedClass = routineDoc.classes[0];
      }
    }

    const resolvedSubject =
      matchedClass?.subject || subject || routineDoc?.subject || "";
    const resolvedDept =
      routineDoc?.department || (department ? standardizeDepartment(department) : "");
    const resolvedSem =
      routineDoc?.semester || (semester ? parseInt(semester, 10) : undefined);
    const resolvedSection =
      routineDoc?.section || (section && section !== "all" ? section : undefined);

    const sessionConditions: any[] = [];
    if (routineDoc?._id) {
      sessionConditions.push({ routineId: routineDoc._id });
    }

    const subjectFilter: any = {};
    if (resolvedSubject && resolvedSubject !== "all") {
      subjectFilter.subject = new RegExp(escapeRegex(resolvedSubject.trim()), "i");
    }
    if (resolvedDept && resolvedDept !== "General") {
      subjectFilter.department = { $in: getDepartmentVariants(resolvedDept) };
    }
    if (resolvedSem) {
      subjectFilter.semester = resolvedSem;
    }
    if (resolvedSection && resolvedSection !== "All" && resolvedSection !== "all") {
      subjectFilter.section = resolvedSection;
    }
    if (Object.keys(subjectFilter).length > 0) {
      sessionConditions.push(subjectFilter);
    }

    let rawSessions: any[] = [];
    if (sessionConditions.length > 0) {
      rawSessions = await Attendance.find({ $or: sessionConditions })
        .sort({ date: 1, createdAt: 1 })
        .populate("presentStudents", "_id name rollNumber email")
        .populate("absentStudents", "_id name rollNumber email")
        .lean();
    } else {
      rawSessions = await Attendance.find({})
        .sort({ date: 1, createdAt: 1 })
        .limit(200)
        .populate("presentStudents", "_id name rollNumber email")
        .populate("absentStudents", "_id name rollNumber email")
        .lean();
    }

    const sessionMap = new Map<string, any>();
    for (const s of rawSessions) {
      sessionMap.set(s._id.toString(), s);
    }
    const uniqueSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const studentQuery: any = { role: "Student" };
    if (resolvedDept && resolvedDept !== "General") {
      studentQuery.department = { $in: getDepartmentVariants(resolvedDept) };
    }
    if (resolvedSem) {
      studentQuery.semester = resolvedSem;
    }
    if (resolvedSection && resolvedSection !== "All" && resolvedSection !== "all") {
      studentQuery.section = resolvedSection;
    }

    const cohortStudents = await User.find(studentQuery)
      .select("_id name rollNumber email")
      .lean();

    const studentMap = new Map<string, any>();
    for (const st of cohortStudents) {
      studentMap.set((st as any)._id.toString(), st);
    }

    for (const sess of uniqueSessions) {
      for (const p of sess.presentStudents || []) {
        if (p && p._id && !studentMap.has(p._id.toString())) {
          studentMap.set(p._id.toString(), p);
        }
      }
      for (const a of sess.absentStudents || []) {
        if (a && a._id && !studentMap.has(a._id.toString())) {
          studentMap.set(a._id.toString(), a);
        }
      }
    }

    const allStudents = Array.from(studentMap.values()).sort((a, b) => {
      const rollA = a.rollNumber || "";
      const rollB = b.rollNumber || "";
      if (rollA && rollB) return rollA.localeCompare(rollB, undefined, { numeric: true });
      return (a.name || "").localeCompare(b.name || "");
    });

    const dateHeaders: { label: string; session: any }[] = [];
    const dateCounts = new Map<string, number>();

    for (const sess of uniqueSessions) {
      const baseLabel = formatSessionDate(sess.date || new Date());
      const c = (dateCounts.get(baseLabel) || 0) + 1;
      dateCounts.set(baseLabel, c);
      const label = c === 1 ? baseLabel : `${baseLabel} (#${c})`;
      dateHeaders.push({ label, session: sess });
    }

    const totalClassesHeld = dateHeaders.length;
    const dataMatrix: Record<string, string | number>[] = [];

    if (allStudents.length === 0) {
      const emptyRow: Record<string, string | number> = {
        "Roll No": "N/A",
        "Student Name": "No enrolled students found for this cohort",
      };
      for (const dh of dateHeaders) {
        emptyRow[dh.label] = "N/A";
      }
      emptyRow["Total Classes Held"] = totalClassesHeld;
      emptyRow["Classes Attended"] = 0;
      emptyRow["Overall Percentage %"] = "0.0%";
      dataMatrix.push(emptyRow);
    } else {
      for (const student of allStudents) {
        const studentIdStr = student._id.toString();
        let classesAttended = 0;

        const row: Record<string, string | number> = {
          "Roll No": student.rollNumber || "N/A",
          "Student Name": student.name || "Student",
        };

        for (const dh of dateHeaders) {
          const isPresent = (dh.session.presentStudents || []).some(
            (p: any) => (p._id ? p._id.toString() : p.toString()) === studentIdStr
          );

          if (isPresent) {
            row[dh.label] = "P";
            classesAttended++;
          } else {
            row[dh.label] = "A";
          }
        }

        const pct =
          totalClassesHeld > 0
            ? ((classesAttended / totalClassesHeld) * 100).toFixed(1) + "%"
            : "0.0%";

        row["Total Classes Held"] = totalClassesHeld;
        row["Classes Attended"] = classesAttended;
        row["Overall Percentage %"] = pct;

        dataMatrix.push(row);
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(dataMatrix);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Semester Attendance Matrix");

    const columnKeys = Object.keys(dataMatrix[0] || {});
    worksheet["!cols"] = columnKeys.map((key) => {
      if (key === "Student Name") return { wch: 26 };
      if (key === "Roll No") return { wch: 16 };
      if (key === "Total Classes Held" || key === "Classes Attended" || key === "Overall Percentage %") {
        return { wch: 20 };
      }
      return { wch: Math.max(key.length + 3, 10) };
    });

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const cleanSubjectName = (resolvedSubject || resolvedDept || "Attendance")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_");
    const filename = `${cleanSubjectName}_Semester_Attendance_Matrix.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_PRERENDER")
    ) {
      throw error;
    }
    console.error("[API: /api/export/attendance] Error:", error);
    const message = error instanceof Error ? error.message : "Error exporting attendance matrix";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
