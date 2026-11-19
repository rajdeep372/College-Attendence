import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { getDepartmentVariants, standardizeDepartment } from "@/lib/departments";
import * as XLSX from "xlsx";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface DefaulterItem {
  _id: string;
  name: string;
  roll: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  subject?: string;
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
  status: string;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const departmentQuery = searchParams.get("department");
    const semesterQuery = searchParams.get("semester");
    const sectionQuery = searchParams.get("section");
    const subjectQuery = searchParams.get("subject");
    const formatQuery = searchParams.get("format");
    const exportQuery = searchParams.get("export");

    // 1. Build student filter
    const studentFilter: Record<string, unknown> = { role: "Student" };

    if (departmentQuery && departmentQuery.toLowerCase() !== "all") {
      studentFilter.department = { $in: getDepartmentVariants(departmentQuery) };
    }
    if (semesterQuery && semesterQuery.toLowerCase() !== "all") {
      const sem = parseInt(semesterQuery, 10);
      if (!isNaN(sem)) studentFilter.semester = sem;
    }
    if (sectionQuery && sectionQuery.toLowerCase() !== "all") {
      studentFilter.section = sectionQuery;
    }

    const students = await User.find(studentFilter)
      .select("_id name email rollNumber department semester section")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // 2. Build attendance query
    const attendanceFilter: Record<string, unknown> = {};
    if (departmentQuery && departmentQuery.toLowerCase() !== "all") {
      attendanceFilter.department = { $in: getDepartmentVariants(departmentQuery) };
    }
    if (semesterQuery && semesterQuery.toLowerCase() !== "all") {
      const sem = parseInt(semesterQuery, 10);
      if (!isNaN(sem)) attendanceFilter.semester = sem;
    }
    if (sectionQuery && sectionQuery.toLowerCase() !== "all") {
      attendanceFilter.section = sectionQuery;
    }
    if (subjectQuery && subjectQuery.toLowerCase() !== "all") {
      attendanceFilter.subject = new RegExp(escapeRegex(subjectQuery.trim()), "i");
    }

    const attendanceRecords = await Attendance.find(attendanceFilter)
      .select("_id date subject department semester section presentStudents absentStudents")
      .lean();

    // 3. Calculate metrics for each student
    const defaulters: DefaulterItem[] = [];

    for (const st of students) {
      const stIdStr = st._id.toString();
      let attended = 0;
      let total = 0;

      for (const rec of attendanceRecords) {
        const presents = (rec.presentStudents || []).map((id: any) => id.toString());
        const absents = (rec.absentStudents || []).map((id: any) => id.toString());

        const isPresent = presents.includes(stIdStr);
        const isAbsent = absents.includes(stIdStr);

        if (isPresent || isAbsent) {
          total++;
          if (isPresent) attended++;
        }
      }

      // If no records specifically listed this student, but attendance sessions were held for their cohort/subject
      // they are counted across those sessions as absent
      if (total === 0 && attendanceRecords.length > 0) {
        total = attendanceRecords.length;
        attended = 0;
      }

      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0.0;

      // Strictly flag students below 75% attendance
      if (percentage < 75.0) {
        defaulters.push({
          _id: stIdStr,
          name: st.name || "Student",
          roll: st.rollNumber || "N/A",
          email: st.email || "",
          department: st.department || (departmentQuery && departmentQuery !== "all" ? departmentQuery : "General"),
          semester: Number(st.semester || semesterQuery || 1),
          section: st.section || (sectionQuery && sectionQuery !== "all" ? sectionQuery : "Section A"),
          subject: subjectQuery && subjectQuery !== "all" ? subjectQuery : "All Curriculum Subjects",
          totalClasses: total,
          attendedClasses: attended,
          percentage,
          status: percentage < 60 ? "Critical Defaulter (<60%)" : "Defaulter (<75%)",
        });
      }
    }

    // Sort by lowest percentage first, then by roll number
    defaulters.sort((a, b) => a.percentage - b.percentage || a.roll.localeCompare(b.roll));

    // 4. Handle Excel (.xlsx) Export
    if (formatQuery === "xlsx" || exportQuery === "true") {
      const rows = defaulters.map((d, idx) => ({
        "Sl No": idx + 1,
        "Roll No": d.roll,
        "Student Name": d.name,
        "Department": d.department,
        "Semester": `Sem ${d.semester}`,
        "Section": d.section,
        "Course / Subject": d.subject || "All Subjects",
        "Total Classes Held": d.totalClasses,
        "Classes Attended": d.attendedClasses,
        "Attendance %": `${d.percentage.toFixed(1)}%`,
        "Academic Status": d.status,
        "Advisory Action": d.percentage < 60 ? "Parent Summons & Detention Warning" : "Faculty Advisory & Make-up Required",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [
        {
          "Sl No": "-",
          "Roll No": "-",
          "Student Name": "No Defaulters (<75%) Found",
          "Department": departmentQuery || "All",
          "Semester": semesterQuery || "All",
          "Section": sectionQuery || "All",
          "Course / Subject": subjectQuery || "All",
          "Total Classes Held": attendanceRecords.length,
          "Classes Attended": "-",
          "Attendance %": "100.0%",
          "Academic Status": "Good Standing (>=75%)",
          "Advisory Action": "None",
        }
      ]);

      // Set readable column widths
      ws["!cols"] = [
        { wch: 8 },  // Sl No
        { wch: 14 }, // Roll No
        { wch: 26 }, // Student Name
        { wch: 32 }, // Department
        { wch: 10 }, // Semester
        { wch: 12 }, // Section
        { wch: 28 }, // Subject
        { wch: 18 }, // Total Classes
        { wch: 16 }, // Classes Attended
        { wch: 14 }, // Attendance %
        { wch: 24 }, // Academic Status
        { wch: 36 }, // Advisory Action
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Defaulters (<75%)");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const deptName = (departmentQuery || "Cohort").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Attendance_Defaulters_Under_75_${deptName}.xlsx`;

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: defaulters.length,
      totalEvaluated: students.length,
      attendanceSessionsCount: attendanceRecords.length,
      defaulters,
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
    console.error("[API: /api/attendance/defaulters] Error:", error);
    const msg = error instanceof Error ? error.message : "Error generating defaulters report";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
