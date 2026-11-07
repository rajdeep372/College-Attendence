import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, idCardSoftCopy } = body;

    const dbUser = await User.findOne({ clerkId: clerkUser.id });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // 1. Action: Upload Soft Copy of ID Card
    if (action === "upload_id_card") {
      if (!idCardSoftCopy) {
        return NextResponse.json(
          { success: false, error: "ID card image data is required" },
          { status: 400 }
        );
      }

      dbUser.idCardSoftCopy = idCardSoftCopy;
      await dbUser.save();

      return NextResponse.json({
        success: true,
        message: "Soft copy of Campus ID card uploaded and securely attached to profile.",
        idCardSoftCopy: dbUser.idCardSoftCopy,
      });
    }

    // 2. Action: Upgrade Semester (New Session)
    if (action === "upgrade_semester") {
      const currentSem = dbUser.semester || 1;
      const nextSem = Math.min(12, currentSem + 1);

      // Calculate attendance stats for the current semester to archive
      const attendanceRecords = await Attendance.find({
        $or: [{ presentStudents: dbUser._id }, { absentStudents: dbUser._id }],
      }).lean();

      let attended = 0;
      let total = attendanceRecords.length;
      for (const rec of attendanceRecords) {
        if (rec.presentStudents.some((id: any) => id.toString() === dbUser._id.toString())) {
          attended++;
        }
      }

      const finalSemesterPct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 100.0;

      // Archive current session
      const archiveEntry = {
        semester: currentSem,
        sessionYear: dbUser.sessionYear || "2024-2025",
        attendancePercentage: finalSemesterPct,
        archivedAt: new Date(),
      };

      if (!dbUser.archivedSessions) {
        dbUser.archivedSessions = [];
      }
      dbUser.archivedSessions.push(archiveEntry);

      // Increment semester and start fresh session
      dbUser.semester = nextSem;
      await dbUser.save();

      return NextResponse.json({
        success: true,
        message: `Session upgraded! Semester ${currentSem} archived (${finalSemesterPct}% attendance). Fresh session initialized for Semester ${nextSem}.`,
        newSemester: nextSem,
        archivedEntry: archiveEntry,
        user: dbUser,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[API: /api/student/session] Error:", error);
    const msg = error instanceof Error ? error.message : "Error processing session update";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

