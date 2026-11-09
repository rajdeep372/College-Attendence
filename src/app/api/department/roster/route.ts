import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Routine from "@/models/Routine";
import { standardizeDepartment, getDepartmentVariants } from "@/lib/departments";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const selectedDepartment = searchParams.get("department");

    // Query strictly matching user requirements:
    // await users.find({ role: { $in: ['Faculty / Teacher', 'Head of Dept (HOD)'] }, department: selectedDepartment })
    const query: Record<string, unknown> = {
      role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)"] },
    };

    if (selectedDepartment && selectedDepartment !== "All") {
      const canonical = standardizeDepartment(selectedDepartment);
      const variants = getDepartmentVariants(canonical);
      query.department = { $in: variants };
    }

    const [facultyList, facultyCount] = await Promise.all([
      User.find(query)
        .select("_id name email role department designation profilePicture rollNumber phone")
        .sort({ name: 1 })
        .lean(),
      User.countDocuments(query),
    ]);

    // Fetch routine load for these teachers
    const teacherIds = facultyList.map((f) => f._id);
    const routines = await Routine.find({
      $or: [
        { teacherId: { $in: teacherIds } },
        { "classes.teacherId": { $in: teacherIds } },
      ],
    }).lean();

    const enrichedFaculty = facultyList.map((f: any) => {
      const routinesCount = routines.reduce((cnt, r: any) => {
        if (r.classes && Array.isArray(r.classes)) {
          return cnt + r.classes.filter((c: any) => c.teacherId?.toString() === f._id.toString()).length;
        }
        return cnt + (r.teacherId?.toString() === f._id.toString() ? 1 : 0);
      }, 0);

      return {
        _id: f._id.toString(),
        name: f.name,
        email: f.email,
        role: f.role,
        department: f.department,
        designation: f.designation || (f.role === "Head of Dept (HOD)" ? "Head of Department" : "Faculty"),
        profilePicture: f.profilePicture || "",
        routinesCount,
      };
    });

    return NextResponse.json({
      success: true,
      department: selectedDepartment || "All",
      count: facultyCount,
      faculty: enrichedFaculty,
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
    const msg = error instanceof Error ? error.message : "Error fetching department faculty roster";
    console.error("[API: /api/department/roster] Error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
