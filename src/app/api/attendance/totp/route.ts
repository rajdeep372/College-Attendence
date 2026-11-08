import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import KioskSession from "@/models/KioskSession";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { generateRandomPin, COLLEGE_COORDINATES } from "@/lib/totp";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      routineId,
      classId,
      subject,
      paperCode = "",
      department,
      academicYear = "1st Year",
      semester,
      section,
      timeSlot = "",
    } = body;

    // 1. Resolve Teacher Identity
    let teacher = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        teacher = await User.findOne({ clerkId: clerkUser.id });
      }
    } catch {
      // Dev mode fallback
    }

    if (!teacher) {
      teacher = await User.findOne({ role: { $in: ["Teacher", "HOD", "Principal"] } });
    }

    if (!teacher) {
      return NextResponse.json(
        { success: false, error: "Teacher authorization required to launch attendance Kiosk." },
        { status: 401 }
      );
    }

    // 2. Validate Routine Context
    if (!subject || !department || !semester || !section) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete class context. Subject, Department, Semester, and Section are strictly required.",
        },
        { status: 400 }
      );
    }

    let validRoutineId: mongoose.Types.ObjectId;
    if (routineId && mongoose.Types.ObjectId.isValid(routineId)) {
      validRoutineId = new mongoose.Types.ObjectId(routineId);
    } else {
      // Find matching routine or create fallback
      const foundRoutine = await Routine.findOne({
        department,
        semester: Number(semester),
        section,
      });
      if (foundRoutine) {
        validRoutineId = foundRoutine._id as mongoose.Types.ObjectId;
      } else {
        validRoutineId = new mongoose.Types.ObjectId();
      }
    }

    // 3. Generate 4-digit PIN and 60-second TTL expiration
    const pin = generateRandomPin();
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds TTL

    // Deactivate previous active sessions for this teacher
    await KioskSession.updateMany(
      { teacherId: teacher._id, isActive: true },
      { $set: { isActive: false } }
    );

    // 4. Save Kiosk Session into MongoDB with TTL
    const kioskSession = await KioskSession.create({
      pin,
      routineId: validRoutineId,
      classId: classId || undefined,
      subject: subject.trim(),
      paperCode: paperCode.trim(),
      department: department.trim(),
      academicYear,
      semester: Number(semester),
      section: section.trim(),
      timeSlot: timeSlot.trim(),
      teacherId: teacher._id,
      teacherName: teacher.name,
      expiresAt,
      isActive: true,
    });

    // 5. Ensure Attendance ledger record exists for today's session
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let attendanceDoc = await Attendance.findOne({
      subject: subject.trim(),
      department: department.trim(),
      semester: Number(semester),
      section: section.trim(),
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!attendanceDoc) {
      // Fetch enrolled students for this cohort to populate initial absent list
      const enrolledStudents = await User.find({
        role: "Student",
        department: department.trim(),
        semester: Number(semester),
        section: section.trim(),
      }).select("_id");

      const studentIds = enrolledStudents.map((s) => s._id);

      attendanceDoc = await Attendance.create({
        routineId: validRoutineId,
        date: new Date(),
        timeSlot: timeSlot.trim(),
        teacherName: teacher.name,
        subject: subject.trim(),
        department: department.trim(),
        academicYear,
        semester: Number(semester),
        section: section.trim(),
        markedBy: teacher._id,
        presentStudents: [],
        absentStudents: studentIds,
      });
    }

    const contextLabel = `Active Session: ${subject} - Sem ${semester} (${section})`;

    return NextResponse.json({
      success: true,
      pin,
      remainingSeconds: 60,
      stepSeconds: 60,
      expiresAt: expiresAt.toISOString(),
      activeSubject: subject,
      activeSemester: Number(semester),
      activeSection: section,
      contextLabel,
      kioskId: kioskSession._id.toString(),
      presentCount: attendanceDoc.presentStudents?.length || 0,
      absentCount: attendanceDoc.absentStudents?.length || 0,
      collegeCoordinates: {
        latitude: COLLEGE_COORDINATES.latitude,
        longitude: COLLEGE_COORDINATES.longitude,
        name: COLLEGE_COORDINATES.name,
        allowedRadiusMeters: COLLEGE_COORDINATES.allowedRadiusMeters,
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
    console.error("[API: /api/attendance/totp POST] Error:", error);
    const message = error instanceof Error ? error.message : "Error generating Kiosk session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const routineId = searchParams.get("routineId");
    const subject = searchParams.get("subject");

    let teacher = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        teacher = await User.findOne({ clerkId: clerkUser.id });
      }
    } catch {
      // Dev mode fallback
    }

    if (!teacher) {
      teacher = await User.findOne({ role: { $in: ["Teacher", "HOD", "Principal"] } });
    }

    // Find active non-expired session
    const query: Record<string, unknown> = {
      isActive: true,
      expiresAt: { $gt: new Date() },
    };

    if (teacher) {
      query.teacherId = teacher._id;
    }
    if (routineId && mongoose.Types.ObjectId.isValid(routineId)) {
      query.routineId = new mongoose.Types.ObjectId(routineId);
    }
    if (subject) {
      query.subject = subject.trim();
    }

    const activeSession = await KioskSession.findOne(query).sort({ createdAt: -1 });

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        activeSession: null,
        collegeCoordinates: COLLEGE_COORDINATES,
      });
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((activeSession.expiresAt.getTime() - Date.now()) / 1000)
    );

    // Get current turnout from attendance doc
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceDoc = await Attendance.findOne({
      subject: activeSession.subject,
      department: activeSession.department,
      semester: activeSession.semester,
      section: activeSession.section,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    return NextResponse.json({
      success: true,
      activeSession: {
        pin: activeSession.pin,
        remainingSeconds,
        stepSeconds: 60,
        expiresAt: activeSession.expiresAt.toISOString(),
        subject: activeSession.subject,
        department: activeSession.department,
        semester: activeSession.semester,
        section: activeSession.section,
        timeSlot: activeSession.timeSlot,
        contextLabel: `Active Session: ${activeSession.subject} - Sem ${activeSession.semester} (${activeSession.section})`,
        presentCount: attendanceDoc?.presentStudents?.length || 0,
        absentCount: attendanceDoc?.absentStudents?.length || 0,
      },
      collegeCoordinates: COLLEGE_COORDINATES,
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
    console.error("[API: /api/attendance/totp GET] Error:", error);
    const message = error instanceof Error ? error.message : "Error reading TOTP state";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
