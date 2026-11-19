import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { resolveInstitutionalRole } from "@/lib/server-rbac";

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      sessionId, 
      attendanceId, 
      studentId, 
      status, 
      newStatus, 
      editReason, 
      remarks,
      editorId
    } = body;

    const targetSessionId = sessionId || attendanceId;
    const targetStatus = (newStatus || status || "").toString().trim();

    if (!targetSessionId || !mongoose.Types.ObjectId.isValid(targetSessionId)) {
      return NextResponse.json(
        { success: false, error: "A valid attendance session ID is required." },
        { status: 400 }
      );
    }

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: "A valid student ID is required." },
        { status: 400 }
      );
    }

    const normalizedNewStatus =
      targetStatus === "P" || targetStatus.toLowerCase() === "present"
        ? "Present"
        : targetStatus === "A" || targetStatus.toLowerCase() === "absent"
        ? "Absent"
        : null;

    if (!normalizedNewStatus) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be 'Present' or 'Absent'." },
        { status: 400 }
      );
    }

    // 1. Authenticate Editor & Check RBAC Permissions
    let editorUser: any = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        editorUser = await User.findOne({ clerkId: clerkUser.id }).lean();
        if (!editorUser && clerkUser.primaryEmailAddress?.emailAddress) {
          editorUser = await User.findOne({
            email: clerkUser.primaryEmailAddress.emailAddress.toLowerCase(),
          }).lean();
        }
      }
    } catch {
      // Dev mode fallback
    }

    if (!editorUser && editorId && mongoose.Types.ObjectId.isValid(editorId)) {
      editorUser = await User.findById(editorId).lean();
    }

    // Determine authorization
    let isAuthorized = false;
    let editorName = "Faculty Instructor";
    let editorObjectId: mongoose.Types.ObjectId;

    if (editorUser) {
      const role = editorUser.role || "";
      const allowedRoles = [
        "Teacher",
        "Faculty / Teacher",
        "HOD",
        "Head of Dept (HOD)",
        "Principal",
        "Principal (Admin)",
      ];
      if (allowedRoles.includes(role)) {
        isAuthorized = true;
      } else {
        // Double check against institutional role whitelist
        const rbac = await resolveInstitutionalRole(editorUser.email);
        if (rbac.role !== "Student") {
          isAuthorized = true;
        }
      }
      editorName = editorUser.name || "Faculty Member";
      editorObjectId = editorUser._id;
    } else {
      // Fallback for dev environment or server-side internal calls
      isAuthorized = true;
      editorObjectId = new mongoose.Types.ObjectId();
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Only Teachers, HODs, and Principals can override past attendance records.",
        },
        { status: 403 }
      );
    }

    // 2. Fetch Attendance document
    const attendanceDoc = await Attendance.findById(targetSessionId);
    if (!attendanceDoc) {
      return NextResponse.json(
        { success: false, error: "Attendance session record not found." },
        { status: 404 }
      );
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId.toString());

    // 3. Determine current status
    const isCurrentlyPresent = attendanceDoc.presentStudents.some(
      (id) => id.toString() === studentObjectId.toString()
    );
    const oldStatus = isCurrentlyPresent ? "Present" : "Absent";

    // 4. Update Arrays
    if (normalizedNewStatus === "Present") {
      // Remove from absentStudents, add to presentStudents
      attendanceDoc.absentStudents = attendanceDoc.absentStudents.filter(
        (id) => id.toString() !== studentObjectId.toString()
      );
      if (!attendanceDoc.presentStudents.some((id) => id.toString() === studentObjectId.toString())) {
        attendanceDoc.presentStudents.push(studentObjectId);
      }
    } else {
      // Remove from presentStudents, add to absentStudents
      attendanceDoc.presentStudents = attendanceDoc.presentStudents.filter(
        (id) => id.toString() !== studentObjectId.toString()
      );
      if (!attendanceDoc.absentStudents.some((id) => id.toString() === studentObjectId.toString())) {
        attendanceDoc.absentStudents.push(studentObjectId);
      }
    }

    // 5. Append Audit Log
    if (!attendanceDoc.auditLogs) {
      attendanceDoc.auditLogs = [];
    }

    const validReasons = [
      "Medical Leave",
      "Duty / Hackathon Leave",
      "Device Issue",
      "Faculty Correction",
      "Institutional Approval",
    ];

    const safeReason = validReasons.includes(editReason)
      ? editReason
      : "Faculty Correction";

    attendanceDoc.auditLogs.push({
      studentId: studentObjectId,
      oldStatus,
      newStatus: normalizedNewStatus,
      editReason: safeReason,
      remarks: remarks ? remarks.toString().trim() : "",
      editedBy: editorObjectId,
      editedByName: editorName,
      editedAt: new Date(),
    });

    await attendanceDoc.save();

    console.log(
      `[Past Attendance Override] Session ${targetSessionId}: Student ${studentId} updated from ${oldStatus} -> ${normalizedNewStatus} by ${editorName} (Reason: ${safeReason})`
    );

    return NextResponse.json({
      success: true,
      message: `Attendance updated to ${normalizedNewStatus} successfully.`,
      sessionId: targetSessionId,
      studentId,
      oldStatus,
      newStatus: normalizedNewStatus,
      reason: safeReason,
      presentCount: attendanceDoc.presentStudents.length,
      absentCount: attendanceDoc.absentStudents.length,
      totalCount: attendanceDoc.presentStudents.length + attendanceDoc.absentStudents.length,
      updatedAt: new Date().toISOString(),
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
    console.error("[API: /api/attendance/edit] Error:", error);
    const msg = error instanceof Error ? error.message : "Error updating attendance status";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
