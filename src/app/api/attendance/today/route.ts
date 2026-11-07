import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User, { IUser } from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { Types } from "mongoose";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const departmentQuery = searchParams.get("department");
    const academicYearQuery = searchParams.get("academicYear");
    const semesterQuery = searchParams.get("semester");
    const sectionQuery = searchParams.get("section");

    // 1. Determine current day of week (Map Sunday to Monday for dev convenience)
    const daysOfWeek: DayOfWeek[] = [
      "Monday", // Sunday fallback
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDayIdx = new Date().getDay();
    const activeDay: DayOfWeek = daysOfWeek[currentDayIdx] || "Monday";

    // 2. Identify teacher from Clerk session or database
    let teacher = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        teacher = await User.findOne({ clerkId: clerkUser.id, role: { $in: ["Teacher", "HOD", "Principal"] } });
      }
    } catch {
      // Dev mode fallback
    }

    if (!teacher) {
      teacher = await User.findOne({ role: { $in: ["Teacher", "HOD", "Principal"] } });
    }

    // Determine target parameters (Department, Academic Year, Semester, Section)
    const targetDepartment = departmentQuery || teacher?.department || "Computer Science & Engineering";
    const targetSemester = semesterQuery ? Number(semesterQuery) : 5;
    const targetSection = sectionQuery || "Section A";
    
    // Deduce academic year if not passed
    const targetAcademicYear = academicYearQuery || (
      targetSemester <= 2 ? "1st Year" :
      targetSemester <= 4 ? "2nd Year" :
      targetSemester <= 6 ? "3rd Year" : "4th Year"
    );

    // 3. Find today's routine matching exact Department + Semester + Section
    const routineFilter: Record<string, unknown> = {
      department: targetDepartment,
      semester: targetSemester,
      section: targetSection,
      dayOfWeek: activeDay,
    };

    let routineDoc = null;
    if (teacher) {
      routineDoc = await Routine.findOne({
        ...routineFilter,
        $or: [{ teacherId: teacher._id }, { "classes.teacherId": teacher._id }],
      })
        .populate("teacherId", "name email department")
        .populate("classes.teacherId", "name email department")
        .lean();
    }

    if (!routineDoc) {
      routineDoc = await Routine.findOne(routineFilter)
        .populate("teacherId", "name email department")
        .populate("classes.teacherId", "name email department")
        .lean();
    }

    // If still no routine today, search for any routine for this exact class
    if (!routineDoc) {
      routineDoc = await Routine.findOne({
        department: targetDepartment,
        semester: targetSemester,
        section: targetSection,
      })
        .populate("teacherId", "name email department")
        .populate("classes.teacherId", "name email department")
        .lean();
    }

    // Resolve subject, timeSlot, and paperCode from day-grouped classes or legacy fields
    let resolvedSubject = "Core Curriculum Lecture";
    let resolvedTimeSlot = "10:00 AM - 11:00 AM";
    let resolvedPaperCode = "";

    if (routineDoc) {
      if ((routineDoc as any).classes && Array.isArray((routineDoc as any).classes) && (routineDoc as any).classes.length > 0) {
        const classesList = (routineDoc as any).classes;
        const matchingClass =
          classesList.find((c: any) => teacher && c.teacherId?.toString() === teacher._id.toString()) ||
          classesList[0];
        resolvedSubject = matchingClass.subject || resolvedSubject;
        resolvedTimeSlot = matchingClass.timeSlot || resolvedTimeSlot;
        resolvedPaperCode = matchingClass.paperCode || "";
      } else if ((routineDoc as any).subject) {
        resolvedSubject = (routineDoc as any).subject;
        resolvedTimeSlot = (routineDoc as any).timeSlot || resolvedTimeSlot;
        resolvedPaperCode = (routineDoc as any).paperCode || "";
      }
    }

    // 4. Fetch Students strictly filtered by the 4 parameters (Role: Student, Department, Semester, Section)
    const studentFilter: Record<string, unknown> = {
      role: "Student",
      department: targetDepartment,
      semester: targetSemester,
      section: targetSection,
    };

    let students = await User.find(studentFilter)
      .sort({ rollNumber: 1, name: 1 })
      .lean<IUser[]>();

    if (!students || students.length === 0) {
      const relaxedFilter: Record<string, unknown> = {
        role: "Student",
        department: targetDepartment,
        semester: targetSemester,
      };
      const unsectioned = await User.find(relaxedFilter).lean<IUser[]>();
      if (unsectioned && unsectioned.length > 0) {
        students = unsectioned;
      }
    }

    // Format students strictly with their real rollNumber from DB/Clerk
    const formattedStudents = students.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      email: s.email,
      roll: s.rollNumber || (s.email.includes("@") ? s.email.split("@")[0].toUpperCase() : "ENR-" + s._id.toString().slice(-4).toUpperCase()),
      department: s.department || targetDepartment,
      academicYear: s.academicYear || targetAcademicYear,
      semester: s.semester || targetSemester,
      section: s.section || targetSection,
      profilePicture: s.profilePicture || "",
    }));

    return NextResponse.json({
      success: true,
      day: activeDay,
      teacher: teacher ? {
        _id: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      } : {
        _id: "",
        name: "Faculty Instructor",
        email: "faculty@college.edu",
        department: targetDepartment,
      },
      targetDepartment,
      targetAcademicYear,
      targetSemester,
      targetSection,
      routine: routineDoc ? {
        _id: routineDoc._id ? routineDoc._id.toString() : "",
        subject: resolvedSubject,
        paperCode: resolvedPaperCode,
        department: (routineDoc as any).department || targetDepartment,
        academicYear: (routineDoc as any).academicYear || targetAcademicYear,
        semester: (routineDoc as any).semester || targetSemester,
        section: (routineDoc as any).section || targetSection,
        timeSlot: resolvedTimeSlot,
        dayOfWeek: (routineDoc as any).dayOfWeek || activeDay,
      } : null,
      studentCount: formattedStudents.length,
      students: formattedStudents,
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
    console.error("[API: /api/attendance/today] Error:", error);
    const message = error instanceof Error ? error.message : "Error fetching today class roster";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
