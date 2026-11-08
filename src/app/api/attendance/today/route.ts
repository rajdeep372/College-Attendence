import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User, { IUser } from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { getIstCurrentTime } from "@/lib/time-utils";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const departmentQuery = searchParams.get("department");
    const academicYearQuery = searchParams.get("academicYear");
    const semesterQuery = searchParams.get("semester");
    const sectionQuery = searchParams.get("section");

    // 1. Strict Day-of-Week Resolution in 'Asia/Kolkata' timezone (IST)
    // Sunday resolves strictly to "Sunday" — ZERO fallback to Monday!
    const { currentDay } = getIstCurrentTime();
    const activeDay = currentDay;

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

    // 3. Strict MongoDB Filtering by dayOfWeek: activeDay (NO fallback to any other day)
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

    // 4. Fetch all available assigned classes for the logged-in teacher for current day
    const teacherRoutineFilter: Record<string, unknown> = {
      dayOfWeek: activeDay,
    };
    if (teacher) {
      teacherRoutineFilter.$or = [
        { teacherId: teacher._id },
        { "classes.teacherId": teacher._id },
        { department: targetDepartment },
      ];
    } else {
      teacherRoutineFilter.department = targetDepartment;
    }

    const todayRoutinesList = await Routine.find(teacherRoutineFilter).lean();
    const availableClasses: Array<{
      routineId: string;
      classId?: string;
      subject: string;
      paperCode: string;
      timeSlot: string;
      department: string;
      academicYear: string;
      semester: number;
      section: string;
    }> = [];

    for (const r of todayRoutinesList) {
      const routineObj = r as any;
      if (routineObj.classes && Array.isArray(routineObj.classes) && routineObj.classes.length > 0) {
        for (const c of routineObj.classes) {
          availableClasses.push({
            routineId: routineObj._id.toString(),
            classId: c._id ? c._id.toString() : undefined,
            subject: c.subject,
            paperCode: c.paperCode || "",
            timeSlot: c.timeSlot,
            department: routineObj.department,
            academicYear: routineObj.academicYear || "1st Year",
            semester: routineObj.semester,
            section: routineObj.section,
          });
        }
      } else if (routineObj.subject) {
        availableClasses.push({
          routineId: routineObj._id.toString(),
          subject: routineObj.subject,
          paperCode: routineObj.paperCode || "",
          timeSlot: routineObj.timeSlot || "",
          department: routineObj.department,
          academicYear: routineObj.academicYear || "1st Year",
          semester: routineObj.semester,
          section: routineObj.section,
        });
      }
    }

    // Resolve subject, timeSlot, and paperCode from day-grouped classes or legacy fields
    let resolvedSubject = "";
    let resolvedTimeSlot = "";
    let resolvedPaperCode = "";

    if (routineDoc) {
      const routineObj = routineDoc as any;
      if (routineObj.classes && Array.isArray(routineObj.classes) && routineObj.classes.length > 0) {
        const classesList = routineObj.classes;
        const matchingClass =
          classesList.find((c: any) => teacher && c.teacherId?.toString() === teacher._id.toString()) ||
          classesList[0];
        resolvedSubject = matchingClass?.subject || "";
        resolvedTimeSlot = matchingClass?.timeSlot || "";
        resolvedPaperCode = matchingClass?.paperCode || "";
      } else if (routineObj.subject) {
        resolvedSubject = routineObj.subject;
        resolvedTimeSlot = routineObj.timeSlot || "";
        resolvedPaperCode = routineObj.paperCode || "";
      }
    }

    // 5. Fetch Students strictly filtered by the 4 parameters (Role: Student, Department, Semester, Section)
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
      availableClasses,
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
