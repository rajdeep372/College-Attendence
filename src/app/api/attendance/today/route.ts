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
  semester: number;
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
    const semesterQuery = searchParams.get("semester");

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

    // 2. Try to identify teacher from Clerk session or query
    let teacher = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        teacher = await User.findOne({ clerkId: clerkUser.id, role: "Teacher" });
      }
    } catch {
      // Dev mode fallback
    }

    if (!teacher) {
      teacher = await User.findOne({ role: "Teacher" });
      if (!teacher) {
        teacher = await User.create({
          clerkId: `teacher_seed_${Date.now()}`,
          name: "Dr. Arvind Sharma",
          email: "arvind.sharma@college.edu",
          role: "Teacher",
          department: "Computer Science",
          profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        });
      }
    }

    // 3. Find today's routine for this teacher or department
    const routineFilter: Record<string, unknown> = {};
    if (departmentQuery) routineFilter.department = departmentQuery;
    if (semesterQuery) routineFilter.semester = Number(semesterQuery);

    let routine = await Routine.findOne({
      ...routineFilter,
      teacherId: teacher._id,
      dayOfWeek: activeDay,
    })
      .populate("teacherId", "name email department")
      .lean<PlainRoutine | null>();

    if (!routine) {
      routine = await Routine.findOne({
        ...routineFilter,
        dayOfWeek: activeDay,
      })
        .populate("teacherId", "name email department")
        .lean<PlainRoutine | null>();
    }

    if (!routine) {
      routine = await Routine.findOne()
        .populate("teacherId", "name email department")
        .lean<PlainRoutine | null>();
    }

    // If no routine exists, return null routine so teacher can specify their class
    const targetDepartment = routine?.department || teacher?.department || "General Academic & Sciences";

    // 4. Fetch all Students for this department & semester
    const studentFilter: Record<string, unknown> = {
      role: "Student",
    };
    if (targetDepartment) {
      studentFilter.department = targetDepartment;
    }
    if (routine?.semester) {
      studentFilter.semester = routine.semester;
    }

    let students = await User.find(studentFilter).lean<IUser[]>();

    // If no students in this exact department, fetch all registered students
    if (!students || students.length === 0) {
      students = await User.find({ role: "Student" }).lean<IUser[]>();
    }

    // Format students with roll numbers
    const formattedStudents = students.map((s, idx) => ({
      _id: s._id.toString(),
      name: s.name,
      email: s.email,
      roll: `2023-CS-0${(idx + 1).toString().padStart(2, "0")}`,
      department: s.department || targetDepartment,
      profilePicture: s.profilePicture || "",
    }));

    return NextResponse.json({
      success: true,
      day: activeDay,
      teacher: {
        _id: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
      },
      routine: routine ? {
        _id: routine._id ? routine._id.toString() : "",
        subject: routine.subject,
        department: targetDepartment,
        semester: routine.semester,
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
