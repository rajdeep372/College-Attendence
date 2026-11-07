import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");

    const query: Record<string, unknown> = {
      $or: [
        { "classes.isUnclaimed": true },
        { "classes.teacherId": null },
        { isUnclaimed: true },
        { teacherId: null },
      ],
    };

    if (department) {
      query.department = department;
    }

    const routines = await Routine.find(query).lean();

    // Aggregate unique unclaimed faculty names and their subjects
    const unclaimedMap: Record<
      string,
      { teacherName: string; classCount: number; subjects: Set<string>; department: string }
    > = {};

    for (const routine of routines) {
      const routineDept = routine.department;

      // Check day-grouped classes array
      if (routine.classes && Array.isArray(routine.classes)) {
        for (const cls of routine.classes) {
          if (cls.isUnclaimed || !cls.teacherId) {
            const rawName = (cls.teacherName || "Unassigned Faculty").trim();
            if (!unclaimedMap[rawName]) {
              unclaimedMap[rawName] = {
                teacherName: rawName,
                classCount: 0,
                subjects: new Set(),
                department: routineDept,
              };
            }
            unclaimedMap[rawName].classCount += 1;
            if (cls.subject) {
              unclaimedMap[rawName].subjects.add(cls.subject);
            }
          }
        }
      } else {
        // Legacy flat routine
        const rawName = ((routine as any).teacherName || "Unassigned Faculty").trim();
        if (!unclaimedMap[rawName]) {
          unclaimedMap[rawName] = {
            teacherName: rawName,
            classCount: 0,
            subjects: new Set(),
            department: routineDept,
          };
        }
        unclaimedMap[rawName].classCount += 1;
        if ((routine as any).subject) {
          unclaimedMap[rawName].subjects.add((routine as any).subject);
        }
      }
    }

    const unclaimedProfiles = Object.values(unclaimedMap).map((item) => ({
      teacherName: item.teacherName,
      classCount: item.classCount,
      department: item.department,
      subjects: Array.from(item.subjects),
    }));

    return NextResponse.json({
      success: true,
      count: unclaimedProfiles.length,
      unclaimedProfiles,
    });
  } catch (error: unknown) {
    console.error("[API: /api/routine/unclaimed GET] Error:", error);
    const msg = error instanceof Error ? error.message : "Error querying unclaimed routine slots";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

