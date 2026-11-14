import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { standardizeDepartment, getDepartmentVariants } from "@/lib/departments";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get("date"); // YYYY-MM-DD
    const searchQuery = searchParams.get("search");
    const subjectQuery = searchParams.get("subject");
    const departmentQuery = searchParams.get("department");
    const semesterQuery = searchParams.get("semester");
    const sectionQuery = searchParams.get("section");
    const teacherIdQuery = searchParams.get("teacherId");
    const limitQuery = searchParams.get("limit");

    // Optional teacher resolution from Clerk if not passed
    let resolvedTeacherId: string | null = teacherIdQuery || null;
    let teacherDept: string | null = null;

    if (!resolvedTeacherId) {
      try {
        const clerkUser = await currentUser();
        if (clerkUser) {
          const dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();
          if (dbUser) {
            resolvedTeacherId = (dbUser as any)._id?.toString() || null;
            teacherDept = (dbUser as any).department || null;
          }
        }
      } catch {
        // Fallback for non-Clerk or public requests
      }
    }

    // Build filter query
    const filter: Record<string, unknown> = {};

    // 1. Department filter
    const targetDept = departmentQuery || teacherDept;
    if (targetDept && targetDept !== "all") {
      filter.department = { $in: getDepartmentVariants(targetDept) };
    }

    // 2. Semester filter
    if (semesterQuery && semesterQuery !== "all") {
      const semNum = parseInt(semesterQuery, 10);
      if (!isNaN(semNum)) {
        filter.semester = semNum;
      }
    }

    // 3. Section filter
    if (sectionQuery && sectionQuery !== "all") {
      filter.section = sectionQuery;
    }

    // 4. Subject filter
    if (subjectQuery && subjectQuery !== "all") {
      filter.subject = new RegExp(escapeRegex(subjectQuery.trim()), "i");
    }

    // 5. Date filter (exact day or range)
    if (dateQuery) {
      const targetDate = new Date(dateQuery);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // 6. General Search keyword filter
    if (searchQuery && searchQuery.trim()) {
      const q = escapeRegex(searchQuery.trim());
      filter.$or = [
        { subject: new RegExp(q, "i") },
        { timeSlot: new RegExp(q, "i") },
        { teacherName: new RegExp(q, "i") },
        { department: new RegExp(q, "i") },
        { section: new RegExp(q, "i") },
      ];
    }

    // 7. Teacher constraint if provided (allow HOD/Principal or department view if teacherId not mandatory)
    if (teacherIdQuery && mongoose.Types.ObjectId.isValid(teacherIdQuery)) {
      filter.markedBy = new mongoose.Types.ObjectId(teacherIdQuery);
    }

    const limit = Math.min(parseInt(limitQuery || "100", 10), 200);

    const records = await Attendance.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate("routineId", "subject paperCode timeSlot department semester section")
      .populate("markedBy", "name email department")
      .populate("presentStudents", "_id name rollNumber email")
      .populate("absentStudents", "_id name rollNumber email")
      .lean();

    const history = records.map((rec: any) => {
      const presents = rec.presentStudents || [];
      const absents = rec.absentStudents || [];
      const presentCount = presents.length;
      const absentCount = absents.length;
      const totalCount = presentCount + absentCount;
      const turnoutPct =
        totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) + "%" : "0.0%";

      return {
        _id: rec._id.toString(),
        date: rec.date ? new Date(rec.date).toISOString() : new Date().toISOString(),
        timeSlot: rec.timeSlot || rec.routineId?.timeSlot || "Scheduled Slot",
        subject: rec.subject || rec.routineId?.subject || "Curriculum Session",
        paperCode: rec.routineId?.paperCode || "",
        department: rec.department || rec.routineId?.department || "General",
        academicYear: rec.academicYear || "1st Year",
        semester: rec.semester || rec.routineId?.semester || 1,
        section: rec.section || rec.routineId?.section || "Section A",
        teacherName: rec.teacherName || rec.markedBy?.name || "Faculty Member",
        teacherId: rec.markedBy?._id ? rec.markedBy._id.toString() : null,
        routineId: rec.routineId?._id ? rec.routineId._id.toString() : null,
        presentCount,
        absentCount,
        totalCount,
        turnoutPercentage: turnoutPct,
        presentStudents: presents.map((s: any) => ({
          _id: s._id ? s._id.toString() : "",
          name: s.name || "Student",
          roll: s.rollNumber || "N/A",
          email: s.email || "",
        })),
        absentStudents: absents.map((s: any) => ({
          _id: s._id ? s._id.toString() : "",
          name: s.name || "Student",
          roll: s.rollNumber || "N/A",
          email: s.email || "",
        })),
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: history.length,
        history,
      },
      { status: 200 }
    );
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
    console.error("[API: /api/attendance/history] Error:", error);
    const msg = error instanceof Error ? error.message : "Error fetching attendance history";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
