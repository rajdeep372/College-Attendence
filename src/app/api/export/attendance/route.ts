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
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day}-${month}`;
}

async function handleExport(req: NextRequest) {
  try {
    await connectToDatabase();

    let routineId: string | null = null;
    let subjectId: string | null = null;
    let subject: string | null = null;
    let department: string | null = null;
    let semester: string | null = null;
    let section: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        routineId = body.routineId || null;
        subjectId = body.subjectId || null;
        subject = body.subject || null;
        department = body.department || null;
        semester = body.semester ? String(body.semester) : null;
        section = body.section || null;
      } catch {
        // Fallback to URL search params
      }
    }

    const { searchParams } = new URL(req.url);
    if (!routineId) routineId = searchParams.get("routineId");
    if (!subjectId) subjectId = searchParams.get("subjectId");
    if (!subject) subject = searchParams.get("subject");
    if (!department) department = searchParams.get("department");
    if (!semester) semester = searchParams.get("semester");
    if (!section) section = searchParams.get("section");

    // 1. Resolve Routine / Class Details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let routineDoc: any = null;
    if (routineId && mongoose.Types.ObjectId.isValid(routineId)) {
      routineDoc = await Routine.findById(routineId).lean();
    }
    if (!routineDoc && subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      routineDoc = await Routine.findOne({
        $or: [
          { _id: subjectId },
          { "classes._id": subjectId },
        ],
      }).lean();
    }

    // Match specific class inside classes array if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchedClass: any = null;
    if (routineDoc && Array.isArray(routineDoc.classes)) {
      if (subjectId) {
        matchedClass = routineDoc.classes.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c._id?.toString() === subjectId || c.subject === subjectId
        );
      }
      if (!matchedClass && subject) {
        matchedClass = routineDoc.classes.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.subject?.toLowerCase() === subject?.toLowerCase()
        );
      }
      if (!matchedClass && routineDoc.classes.length > 0) {
        matchedClass = routineDoc.classes[0];
      }
    }

    const resolvedSubject =
      matchedClass?.subject || subject || routineDoc?.subject || "Attendance_Report";
    const resolvedDept =
      routineDoc?.department || (department ? standardizeDepartment(department) : "General");
    const resolvedSem =
      routineDoc?.semester || (semester ? parseInt(semester, 10) : undefined);
    const resolvedSection =
      routineDoc?.section || section || undefined;

    // 2. Fetch every single attendance session recorded for that class
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attendanceQueries: any[] = [];

    if (routineDoc?._id) {
      attendanceQueries.push({ routineId: routineDoc._id });
    }

    if (resolvedSubject) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cond: any = {
        subject: new RegExp(`^${escapeRegex(resolvedSubject)}$`, "i"),
      };
      if (resolvedDept && resolvedDept !== "General") {
        cond.department = { $in: getDepartmentVariants(resolvedDept) };
      }
      if (resolvedSem) {
        cond.semester = resolvedSem;
      }
      if (resolvedSection && resolvedSection !== "All") {
        cond.section = resolvedSection;
      }
      attendanceQueries.push(cond);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[] = [];
    if (attendanceQueries.length > 0) {
      sessions = await Attendance.find({ $or: attendanceQueries })
        .sort({ date: 1 })
        .populate("presentStudents", "name rollNumber email registrationNumber regNo")
        .populate("absentStudents", "name rollNumber email registrationNumber regNo")
        .lean();
    }

    // Deduplicate sessions by _id just in case
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionMap = new Map<string, any>();
    for (const s of sessions) {
      sessionMap.set(s._id.toString(), s);
    }
    const uniqueSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 3. Fetch all students mapped to that class
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentQuery: any = { role: "Student" };
    if (resolvedDept && resolvedDept !== "General") {
      studentQuery.department = { $in: getDepartmentVariants(resolvedDept) };
    }
    if (resolvedSem) {
      studentQuery.semester = resolvedSem;
    }
    if (resolvedSection && resolvedSection !== "All") {
      studentQuery.section = resolvedSection;
    }

    const cohortStudents = await User.find(studentQuery)
      .select("_id name rollNumber email registrationNumber regNo batchDuration")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentMap = new Map<string, any>();
    for (const st of cohortStudents) {
      studentMap.set(st._id.toString(), st);
    }

    // Also include any student who attended or was marked in the sessions
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

    // 4. Build Dynamic Columns: Every date a class was actually held (e.g., '12-Nov', '15-Nov')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateHeaders: { label: string; session: any }[] = [];
    const dateCounts = new Map<string, number>();

    for (const sess of uniqueSessions) {
      const baseLabel = formatSessionDate(sess.date || new Date());
      const c = (dateCounts.get(baseLabel) || 0) + 1;
      dateCounts.set(baseLabel, c);
      const label = c === 1 ? baseLabel : `${baseLabel} (#${c})`;
      dateHeaders.push({ label, session: sess });
    }

    // 5. Build Dynamic Data Matrix
    // Rows: Student Details (Roll No, Reg No, Full Name)
    // Dynamic Columns: Dates ('P' or 'A')
    // Final Columns: 'Total Classes', 'Attended', 'Total Percentage %'
    const totalClassesHeld = dateHeaders.length;
    const dataMatrix: Record<string, string | number>[] = [];

    if (allStudents.length === 0) {
      const emptyRow: Record<string, string | number> = {
        "Roll No": "N/A",
        "Reg No": "N/A",
        "Full Name": "No enrolled students found for this class section",
      };
      for (const dh of dateHeaders) {
        emptyRow[dh.label] = "N/A";
      }
      emptyRow["Total Classes"] = totalClassesHeld;
      emptyRow["Attended"] = 0;
      emptyRow["Total Percentage %"] = "0.0%";
      dataMatrix.push(emptyRow);
    } else {
      for (const student of allStudents) {
        const studentIdStr = student._id.toString();
        let attendedCount = 0;

        const row: Record<string, string | number> = {
          "Roll No": student.rollNumber || "N/A",
          "Reg No":
            student.registrationNumber ||
            student.regNo ||
            student.batchDuration ||
            student.rollNumber ||
            "N/A",
          "Full Name": student.name || "Student",
        };

        for (const dh of dateHeaders) {
          const isPresent = (dh.session.presentStudents || []).some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => (p._id ? p._id.toString() : p.toString()) === studentIdStr
          );

          if (isPresent) {
            row[dh.label] = "P";
            attendedCount++;
          } else {
            row[dh.label] = "A";
          }
        }

        row["Total Classes"] = totalClassesHeld;
        row["Attended"] = attendedCount;
        row["Total Percentage %"] =
          totalClassesHeld > 0
            ? `${((attendedCount / totalClassesHeld) * 100).toFixed(1)}%`
            : "0.0%";

        dataMatrix.push(row);
      }
    }

    // 6. Build Excel Workbook with xlsx
    const worksheet = XLSX.utils.json_to_sheet(dataMatrix);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Matrix");

    // Auto-fit column widths
    const keys = Object.keys(dataMatrix[0] || {});
    worksheet["!cols"] = keys.map((key) => {
      if (key === "Full Name") return { wch: 25 };
      if (key === "Roll No") return { wch: 18 };
      if (key === "Reg No") return { wch: 18 };
      if (key === "Total Classes") return { wch: 14 };
      if (key === "Attended") return { wch: 12 };
      if (key === "Total Percentage %") return { wch: 18 };
      return { wch: Math.max(key.length + 3, 11) };
    });

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Dynamic Filename: e.g. [Subject_Name]_Attendance_Report.xlsx
    const cleanSubject = (resolvedSubject || "Class")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_");
    const filename = `${cleanSubject}_Attendance_Report.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("[API: /api/export/attendance] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Error generating Excel attendance matrix";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}

