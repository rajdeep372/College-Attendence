import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const semester = searchParams.get("semester");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");
    const format = searchParams.get("format") || "xlsx";

    // Build filter
    const filter: Record<string, unknown> = {};
    if (department && department !== "all") {
      filter.department = department;
    }
    if (semester && semester !== "all") {
      filter.semester = parseInt(semester, 10);
    }
    if (section && section !== "all") {
      filter.section = section;
    }
    if (academicYear && academicYear !== "all") {
      filter.academicYear = academicYear;
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .limit(500)
      .populate("routineId", "subject department semester timeSlot")
      .populate("markedBy", "name email")
      .populate("presentStudents", "name rollNumber email")
      .populate("absentStudents", "name rollNumber email")
      .lean();

    // Prepare structured Excel data rows
    const dataRows = [];

    if (records.length === 0) {
      dataRows.push({
        "Date": new Date().toISOString().split("T")[0],
        "Time Slot": "N/A",
        "Teacher Name": "Institutional Ledger",
        "Class / Subject": "No Recorded Sessions Yet",
        "Department": department || "College-Wide",
        "Academic Year": academicYear || "All",
        "Semester": semester || "All",
        "Section": section || "All",
        "Present Count": 0,
        "Absent Count": 0,
        "Turnout Percentage": "0.0%",
        "Present Student Rolls": "None",
        "Absent Student Rolls": "None",
      });
    } else {
      for (const rec of records) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routine = rec.routineId as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teacher = rec.markedBy as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const presents = (rec.presentStudents || []) as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const absents = (rec.absentStudents || []) as any[];

        const presentCount = presents.length;
        const absentCount = absents.length;
        const total = presentCount + absentCount;
        const pct = total > 0 ? ((presentCount / total) * 100).toFixed(1) + "%" : "0.0%";

        const presentRolls = presents.map((s) => s.rollNumber || s.name).join("; ");
        const absentRolls = absents.map((s) => s.rollNumber || s.name).join("; ");

        const dateStr = rec.date ? new Date(rec.date).toISOString().split("T")[0] : "N/A";

        dataRows.push({
          "Date": dateStr,
          "Time Slot": rec.timeSlot || routine?.timeSlot || "Scheduled Slot",
          "Teacher Name": rec.teacherName || teacher?.name || "Faculty",
          "Class / Subject": rec.subject || routine?.subject || "Core Lecture",
          "Department": rec.department || routine?.department || department || "General",
          "Academic Year": rec.academicYear || "3rd Year",
          "Semester": rec.semester || routine?.semester || 1,
          "Section": rec.section || routine?.section || section || "Section A",
          "Present Count": presentCount,
          "Absent Count": absentCount,
          "Turnout Percentage": pct,
          "Present Student Rolls": presentRolls || "None",
          "Absent Student Rolls": absentRolls || "None",
        });
      }
    }

    // Build Excel Workbook using xlsx
    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");

    // Auto-fit column widths
    const columnKeys = Object.keys(dataRows[0]);
    worksheet["!cols"] = columnKeys.map((key) => ({
      wch: Math.max(key.length, 14),
    }));

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = `attendance-audit-${department ? department.toLowerCase().replace(/\s+/g, "-") : "campus"}-${new Date().toISOString().split("T")[0]}.xlsx`;

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
    console.error("[API: /api/attendance/export] Error:", error);
    const message = error instanceof Error ? error.message : "Error generating attendance report";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
