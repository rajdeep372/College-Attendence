import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const semester = searchParams.get("semester");
    const format = searchParams.get("format") || "csv";

    // Build filter
    const routineFilter: Record<string, unknown> = {};
    if (department && department !== "all") {
      routineFilter.department = department;
    }
    if (semester && semester !== "all") {
      routineFilter.semester = parseInt(semester, 10);
    }

    let matchingRoutineIds: unknown[] = [];
    if (Object.keys(routineFilter).length > 0) {
      const routines = await Routine.find(routineFilter).select("_id").lean();
      matchingRoutineIds = routines.map((r) => r._id);
    }

    const attendanceFilter: Record<string, unknown> = {};
    if (matchingRoutineIds.length > 0) {
      attendanceFilter.routineId = { $in: matchingRoutineIds };
    }

    const records = await Attendance.find(attendanceFilter)
      .sort({ date: -1 })
      .limit(200)
      .populate("routineId", "subject department semester timeSlot")
      .populate("markedBy", "name email")
      .populate("presentStudents", "name rollNumber email")
      .populate("absentStudents", "name rollNumber email")
      .lean();

    // Prepare CSV rows
    const headers = [
      "Session Date",
      "Department",
      "Semester",
      "Course Subject",
      "Time Slot",
      "Instructor",
      "Present Students Count",
      "Absent Students Count",
      "Turnout Percentage",
      "Present Student Rolls",
      "Absent Student Rolls",
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows: string[] = [];
    rows.push(headers.join(","));

    if (records.length === 0) {
      // Add informational row
      rows.push(
        [
          escapeCsv(new Date().toISOString().split("T")[0]),
          escapeCsv(department || "Campus-Wide"),
          escapeCsv("All"),
          escapeCsv("No Sessions Recorded Yet"),
          escapeCsv("N/A"),
          escapeCsv("System Ledger"),
          escapeCsv(0),
          escapeCsv(0),
          escapeCsv("0.0%"),
          escapeCsv("N/A"),
          escapeCsv("N/A"),
        ].join(",")
      );
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
        const percent = total > 0 ? ((presentCount / total) * 100).toFixed(1) + "%" : "0.0%";

        const presentRolls = presents.map((s) => s.rollNumber || s.name).join("; ");
        const absentRolls = absents.map((s) => s.rollNumber || s.name).join("; ");

        const dateStr = rec.date ? new Date(rec.date).toISOString().split("T")[0] : "N/A";

        rows.push(
          [
            escapeCsv(dateStr),
            escapeCsv(routine?.department || department || "General"),
            escapeCsv(routine?.semester || 5),
            escapeCsv(routine?.subject || "Core Lecture"),
            escapeCsv(routine?.timeSlot || "Scheduled Slot"),
            escapeCsv(teacher?.name || "Faculty Member"),
            escapeCsv(presentCount),
            escapeCsv(absentCount),
            escapeCsv(percent),
            escapeCsv(presentRolls),
            escapeCsv(absentRolls),
          ].join(",")
        );
      }
    }

    const csvOutput = rows.join("\r\n");
    const filename = `attendance-audit-${department ? department.toLowerCase().replace(/\s+/g, "-") : "all"}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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

