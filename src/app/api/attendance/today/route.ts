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

    // If still no routine exists, create a default class routine
    if (!routine) {
      const createdRoutine = await Routine.create({
        department: "Computer Science",
        semester: 5,
        dayOfWeek: activeDay,
        subject: "CS-504 Database Management Systems",
        timeSlot: "11:30 AM - 12:30 PM",
        teacherId: teacher._id,
      });

      const populated = await Routine.findById(createdRoutine._id)
        .populate("teacherId", "name email department")
        .lean<PlainRoutine | null>();

      routine = populated;
    }

    const targetDepartment = routine?.department || "Computer Science";

    // 4. Fetch all Students for this department & semester
    const studentFilter: Record<string, unknown> = {
      role: "Student",
      department: targetDepartment,
    };

    let students = await User.find(studentFilter).lean<IUser[]>();

    // If student cohort is too small, provision a sample batch of 10 students with roll numbers & photos
    if (!students || students.length < 8) {
      const sampleCohort = [
        { name: "Aarav Patel", email: "aarav.patel@college.edu", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
        { name: "Sneha Rao", email: "sneha.rao@college.edu", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
        { name: "Vikram Malhotra", email: "vikram.malhotra@college.edu", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
        { name: "Ananya Sen", email: "ananya.sen@college.edu", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
        { name: "Rohan Verma", email: "rohan.verma@college.edu", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
        { name: "Pooja Hegde", email: "pooja.hegde@college.edu", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
        { name: "Aditya Roy", email: "aditya.roy@college.edu", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" },
        { name: "Kavya Menon", email: "kavya.menon@college.edu", photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80" },
        { name: "Devansh Dixit", email: "devansh.dixit@college.edu", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
        { name: "Meera Nair", email: "meera.nair@college.edu", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
      ];

      for (let i = 0; i < sampleCohort.length; i++) {
        const item = sampleCohort[i];
        await User.findOneAndUpdate(
          { email: item.email },
          {
            clerkId: `student_cohort_${i + 1}`,
            name: item.name,
            email: item.email,
            phone: `+91 98765 432${i}0`,
            role: "Student",
            department: targetDepartment,
            profilePicture: item.photo,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      students = await User.find(studentFilter).lean<IUser[]>();
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
      routine: {
        _id: routine?._id ? routine._id.toString() : "",
        subject: routine?.subject || "CS-504 Database Management Systems",
        department: targetDepartment,
        semester: routine?.semester || 5,
        timeSlot: routine?.timeSlot || "11:30 AM - 12:30 PM",
        dayOfWeek: routine?.dayOfWeek || activeDay,
      },
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
