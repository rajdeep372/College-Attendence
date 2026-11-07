import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User, { IUser } from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { Types } from "mongoose";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

interface PlainRoutine {
  _id: Types.ObjectId | string;
  department: string;
  academicYear?: string;
  semester: number;
  section?: string;
  dayOfWeek: DayOfWeek;
  subject: string;
  timeSlot: string;
  teacherId?: Types.ObjectId | { _id: Types.ObjectId; name?: string; email?: string } | null;
}

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
      if (!teacher) {
        teacher = await User.create({
          clerkId: `teacher_seed_${Date.now()}`,
          name: "Dr. Arvind Sharma",
          email: "arvind.sharma@college.edu",
          role: "Teacher",
          department: "Computer Science & Engineering",
          profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        });
      }
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

    let routine = await Routine.findOne({
      ...routineFilter,
      teacherId: teacher._id,
    })
      .populate("teacherId", "name email department")
      .lean<PlainRoutine | null>();

    if (!routine) {
      routine = await Routine.findOne(routineFilter)
        .populate("teacherId", "name email department")
        .lean<PlainRoutine | null>();
    }

    // If still no routine today, search for any routine for this exact class
    if (!routine) {
      routine = await Routine.findOne({
        department: targetDepartment,
        semester: targetSemester,
        section: targetSection,
      })
        .populate("teacherId", "name email department")
        .lean<PlainRoutine | null>();
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

    // If no students in exact section/semester, do a relaxed search for this department + semester
    // only if strictly no students match section yet, so teachers can see unsectioned or newly registered students
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
      teacher: {
        _id: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      },
      targetDepartment,
      targetAcademicYear,
      targetSemester,
      targetSection,
      routine: routine ? {
        _id: routine._id ? routine._id.toString() : "",
        subject: routine.subject,
        department: routine.department || targetDepartment,
        academicYear: routine.academicYear || targetAcademicYear,
        semester: routine.semester || targetSemester,
        section: routine.section || targetSection,
        timeSlot: routine.timeSlot,
        dayOfWeek: routine.dayOfWeek || activeDay,
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
