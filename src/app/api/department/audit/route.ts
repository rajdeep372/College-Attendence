import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";
import User from "@/models/User";
import Routine from "@/models/Routine";
import Attendance from "@/models/Attendance";
import { standardizeDepartment, getDepartmentVariants } from "@/lib/departments";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const queryDept = searchParams.get("department");

    let userDept = queryDept;

    if (!userDept) {
      try {
        const clerkUser = await currentUser();
        if (clerkUser) {
          const dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();
          if (dbUser?.department) {
            userDept = dbUser.department;
          }
        }
      } catch {
        // Fallback
      }
    }

    const resolvedDepartment = standardizeDepartment(userDept || "Bachelor of Computer Applications (BCA)");
    const deptVariants = getDepartmentVariants(resolvedDepartment);

    // 1. Total enrolled students in user's department
    const totalStudents = await User.countDocuments({
      role: "Student",
      department: { $in: deptVariants },
    });

    // 2. Total registered faculty in user's department
    const totalFaculty = await User.countDocuments({
      role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)", "Teacher", "HOD"] },
      department: { $in: deptVariants },
    });

    // 3. Active scheduled classes for this department from MongoDB Routine collection
    const routines = await Routine.find({ department: { $in: deptVariants } }).lean();
    const activeClasses = routines.reduce(
      (acc, r: any) => acc + (r.classes?.length || 1),
      0
    );

    // 4. Real mathematically calculated department turnout index
    const attendanceLogs = await Attendance.find({ department: resolvedDepartment }).lean();
    let totalPresents = 0;
    let totalAbsents = 0;

    for (const log of attendanceLogs) {
      totalPresents += log.presentStudents?.length || 0;
      totalAbsents += log.absentStudents?.length || 0;
    }

    const totalMarked = totalPresents + totalAbsents;
    const turnoutPercentage =
      totalMarked > 0
        ? parseFloat(((totalPresents / totalMarked) * 100).toFixed(1))
        : 0.0;

    const turnoutText =
      totalMarked > 0 ? `${turnoutPercentage.toFixed(1)}% Compliance` : "0.0% (No Sessions)";

    const timetableSyncText =
      activeClasses > 0
        ? `${activeClasses} Sessions Synchronized`
        : "Timetable Pending HOD Upload";

    return NextResponse.json({
      success: true,
      department: resolvedDepartment,
      totalStudents,
      totalFaculty,
      activeClasses,
      attendanceSessionsCount: attendanceLogs.length,
      averageAttendance: turnoutPercentage,
      turnoutText,
      geofenceStatus: "Operational (≤150m RCCIIT Campus)",
      timetableSyncText,
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
    console.error("[API: /api/department/audit GET] Error:", error);
    const msg = error instanceof Error ? error.message : "Error aggregating department audit metrics";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

