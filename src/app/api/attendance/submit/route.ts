import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import mongoose from "mongoose";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { routineId, presentStudents = [], absentStudents = [], markedBy, date } = body;

    if (!routineId) {
      return NextResponse.json(
        { success: false, error: "routineId is required to submit attendance." },
        { status: 400 }
      );
    }

    // Resolve teacher marking the attendance
    let teacherId = markedBy;
    if (!teacherId) {
      try {
        const clerkUser = await currentUser();
        if (clerkUser) {
          const dbTeacher = await User.findOne({ clerkId: clerkUser.id });
          if (dbTeacher) teacherId = dbTeacher._id;
        }
      } catch {
        // Fallback below
      }
    }

    if (!teacherId) {
      const defaultTeacher = await User.findOne({ role: "Teacher" });
      teacherId = defaultTeacher?._id || new mongoose.Types.ObjectId();
    }

    // Clean up student IDs
    const validPresentIds = presentStudents
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const validAbsentIds = absentStudents
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    // Save attendance record to MongoDB
    const attendanceRecord = await Attendance.create({
      routineId: new mongoose.Types.ObjectId(routineId),
      presentStudents: validPresentIds,
      absentStudents: validAbsentIds,
      markedBy: teacherId,
      date: date ? new Date(date) : new Date(),
    });

    console.log(`[Attendance API] Saved attendance record ${attendanceRecord._id}. Present: ${validPresentIds.length}, Absent: ${validAbsentIds.length}`);

    return NextResponse.json({
      success: true,
      message: `Attendance marked successfully! ${validPresentIds.length} Present, ${validAbsentIds.length} Absent recorded in MongoDB.`,
      attendanceId: attendanceRecord._id.toString(),
      presentCount: validPresentIds.length,
      absentCount: validAbsentIds.length,
      totalStudents: validPresentIds.length + validAbsentIds.length,
      record: attendanceRecord,
    });
  } catch (error: unknown) {
    console.error("[API: /api/attendance/submit] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to record attendance";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

