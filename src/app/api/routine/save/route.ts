import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User from "@/models/User";
import mongoose from "mongoose";

interface RoutineClassInput {
  timeSlot: string;
  paperCode?: string;
  subject: string;
  teacherName: string;
}

interface GroupedDayInput {
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  classes: RoutineClassInput[];
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      department,
      academicYear,
      semester,
      section,
      groupedRoutines = [],
      facultyMapping = {},
    }: {
      department: string;
      academicYear: string;
      semester: number;
      section: string;
      groupedRoutines: GroupedDayInput[];
      facultyMapping: Record<string, string>;
    } = body;

    if (!department || !semester || !section) {
      return NextResponse.json(
        { success: false, error: "Department, Semester, and Section are mandatory." },
        { status: 400 }
      );
    }

    if (!Array.isArray(groupedRoutines) || groupedRoutines.length === 0) {
      return NextResponse.json(
        { success: false, error: "No day-grouped routines provided to save." },
        { status: 400 }
      );
    }

    const cleanDepartment = department.trim();
    const cleanSemester = Number(semester);
    const cleanSection = section.trim();
    const cleanAcademicYear =
      academicYear ||
      (cleanSemester <= 2
        ? "1st Year"
        : cleanSemester <= 4
        ? "2nd Year"
        : cleanSemester <= 6
        ? "3rd Year"
        : "4th Year");

    // Pre-fetch all mapped teachers in a single query to verify IDs without creating dummy users
    const mappedIds = Object.values(facultyMapping).filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const registeredTeachers = await User.find({
      _id: { $in: mappedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("_id name email department")
      .lean();

    const teacherMap = new Map<string, { _id: mongoose.Types.ObjectId; name: string }>();
    for (const t of registeredTeachers) {
      teacherMap.set(t._id.toString(), {
        _id: t._id as mongoose.Types.ObjectId,
        name: t.name,
      });
    }

    // 1. Delete previous routines for this exact Department, Semester & Section
    await Routine.deleteMany({
      department: cleanDepartment,
      semester: cleanSemester,
      section: cleanSection,
    });

    let totalClassesCount = 0;
    const documentsToInsert = [];

    // 2. Build exactly ONE document per day
    for (const dayGroup of groupedRoutines) {
      const dayClasses = (dayGroup.classes || []).map((cls) => {
        totalClassesCount += 1;
        const rawTeacherName = (cls.teacherName || "Unassigned Faculty").trim();
        const mappedId = facultyMapping[rawTeacherName];

        let assignedTeacherId: mongoose.Types.ObjectId | null = null;
        let assignedTeacherName = rawTeacherName;
        let isUnclaimed = true;

        if (mappedId && mappedId !== "unclaimed" && teacherMap.has(mappedId)) {
          const verifiedTeacher = teacherMap.get(mappedId)!;
          assignedTeacherId = verifiedTeacher._id;
          assignedTeacherName = verifiedTeacher.name;
          isUnclaimed = false;
        }

        return {
          timeSlot: cls.timeSlot || "10:00 AM - 11:00 AM",
          paperCode: (cls.paperCode || "").trim(),
          subject: (cls.subject || "Academic Class").trim(),
          teacherName: assignedTeacherName,
          teacherId: assignedTeacherId,
          isUnclaimed,
        };
      });

      if (dayClasses.length > 0) {
        documentsToInsert.push({
          department: cleanDepartment,
          academicYear: cleanAcademicYear,
          semester: cleanSemester,
          section: cleanSection,
          dayOfWeek: dayGroup.dayOfWeek,
          classes: dayClasses,
          // Legacy backward compatibility fields
          paperCode: dayClasses[0]?.paperCode || "",
          subject: dayClasses[0]?.subject || "Day Curriculum Schedule",
          timeSlot: dayClasses[0]?.timeSlot || "10:00 AM - 05:00 PM",
          teacherId: dayClasses[0]?.teacherId || undefined,
        });
      }
    }

    if (documentsToInsert.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid classes found in the provided day groups." },
        { status: 400 }
      );
    }

    const inserted = await Routine.insertMany(documentsToInsert);

    console.log(
      `[API: /api/routine/save] Saved ${inserted.length} days with ${totalClassesCount} classes for ${cleanDepartment} (Sem ${cleanSemester} - ${cleanSection}). Zero ghost users created.`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${inserted.length} days with ${totalClassesCount} scheduled classes into MongoDB.`,
      daysSaved: inserted.length,
      totalClasses: totalClassesCount,
      department: cleanDepartment,
      academicYear: cleanAcademicYear,
      semester: cleanSemester,
      section: cleanSection,
    });
  } catch (error: unknown) {
    console.error("[API: /api/routine/save POST] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to save day-grouped routine";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

