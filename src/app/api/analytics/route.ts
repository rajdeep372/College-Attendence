import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import Routine from "@/models/Routine";
import User from "@/models/User";
import Leave from "@/models/Leave";
import Circular from "@/models/Circular";
import { currentUser } from "@clerk/nextjs/server";
import mongoose, { Types } from "mongoose";
import { getIstCurrentTime, computeClassStatus } from "@/lib/time-utils";
import { 
  STANDARD_DEPARTMENTS, 
  standardizeDepartment, 
  getDepartmentVariants, 
  isSameDepartment 
} from "@/lib/departments";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    let role = searchParams.get("role");
    let userId = searchParams.get("userId");
    let department = searchParams.get("department");

    // Attempt to resolve caller from Clerk if not passed
    let dbUser = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();
        if (dbUser) {
          if (!role) role = dbUser.role;
          if (!userId) userId = dbUser._id.toString();
          if (!department) department = dbUser.department;
        }
      }
    } catch {
      // Continue
    }

    if (!role) role = "Student";

    // -------------------------------------------------------------
    // 1. STUDENT ANALYTICS
    // -------------------------------------------------------------
    if (role === "Student") {
      let targetStudentId: Types.ObjectId | null = null;
      if (userId && Types.ObjectId.isValid(userId)) {
        targetStudentId = new Types.ObjectId(userId);
      } else if (dbUser?._id) {
        targetStudentId = dbUser._id as Types.ObjectId;
      }

      // If no student ID resolved, find any student
      let targetStudentDoc: any = dbUser;
      if (!targetStudentId) {
        const anyStudent = await User.findOne({ role: "Student" }).lean();
        if (anyStudent) {
          targetStudentId = anyStudent._id as Types.ObjectId;
          targetStudentDoc = anyStudent;
        }
      } else if (!targetStudentDoc) {
        targetStudentDoc = await User.findById(targetStudentId).lean();
      }

      // Query attendance records involving this student
      let attendanceRecords: any[] = [];
      if (targetStudentId) {
        attendanceRecords = await Attendance.find({
          $or: [
            { presentStudents: targetStudentId },
            { absentStudents: targetStudentId },
          ],
        })
          .populate("routineId", "subject department semester timeSlot")
          .sort({ date: -1 })
          .lean();
      }

      // Aggregate totals and subject breakdown directly from real MongoDB attendance records
      const subjectMap: Record<string, { code: string; name: string; attended: number; total: number }> = {};
      let totalAttended = 0;
      let totalConducted = 0;

      for (const rec of attendanceRecords) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routine = rec.routineId as any;
        const subjName = rec.subject || routine?.subject || "Core Lecture";
        const subjCode = routine?.paperCode || (subjName.includes(" ") ? subjName.split(" ")[0] : "ACAD");

        if (!subjectMap[subjName]) {
          subjectMap[subjName] = {
            code: subjCode,
            name: subjName,
            attended: 0,
            total: 0,
          };
        }

        const isPresent = (rec.presentStudents || []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (id: any) => id.toString() === targetStudentId?.toString()
        );

        subjectMap[subjName].total += 1;
        totalConducted += 1;

        if (isPresent) {
          subjectMap[subjName].attended += 1;
          totalAttended += 1;
        }
      }

      // Also incorporate scheduled subjects from Routine for this student's department, semester, section
      // so the student can see their enrolled curriculum even before attendance has been taken
      const studentDept = department || targetStudentDoc?.department || "Computer Science & Engineering";
      const studentSem = targetStudentDoc?.semester || 1;
      const studentSec = targetStudentDoc?.section || "Section A";

      const scheduledRoutines = await Routine.find({
        department: studentDept,
        semester: studentSem,
        section: studentSec,
      }).lean();

      for (const r of scheduledRoutines) {
        if ((r as any).classes && Array.isArray((r as any).classes) && (r as any).classes.length > 0) {
          for (const c of (r as any).classes) {
            if (c.subject && !subjectMap[c.subject]) {
              subjectMap[c.subject] = {
                code: c.paperCode || (c.subject.includes(" ") ? c.subject.split(" ")[0] : "SUBJ"),
                name: c.subject,
                attended: 0,
                total: 0,
              };
            }
          }
        } else if (r.subject && !subjectMap[r.subject]) {
          subjectMap[r.subject] = {
            code: (r as any).paperCode || (r.subject.includes(" ") ? r.subject.split(" ")[0] : "SUBJ"),
            name: r.subject,
            attended: 0,
            total: 0,
          };
        }
      }

      // Compute strictly mathematical subject percentage
      const subjectsList = Object.values(subjectMap).map((sub) => {
        const pct = sub.total > 0 ? parseFloat(((sub.attended / sub.total) * 100).toFixed(1)) : 0.0;
        let status = "pending";
        if (sub.total > 0) {
          if (pct >= 85) status = "safe";
          else if (pct >= 75) status = "warning";
          else status = "critical";
        }
        return {
          code: sub.code,
          name: sub.name,
          attended: sub.attended,
          total: sub.total,
          percent: pct,
          status,
        };
      });

      // Strict Mathematical Overall Turnout
      // Current Turnout = (totalAttended / totalConducted) * 100
      // If totalConducted === 0, strictly 0.0% (No classes conducted)
      const overallPercentage =
        totalConducted > 0
          ? parseFloat(((totalAttended / totalConducted) * 100).toFixed(1))
          : 0.0;

      // Real College Permissible Bunks Threshold (75% institutional requirement)
      // If 0 classes conducted: cannot bunk future classes, permissible = 0
      // If currently >= 75%: floor(totalAttended / 0.75 - totalConducted)
      // If currently < 75%: 0 permissible bunks
      const allowedAbsences =
        totalConducted > 0 && overallPercentage >= 75
          ? Math.max(0, Math.floor(totalAttended / 0.75 - totalConducted))
          : 0;

      // Classes needed to recover to 75% threshold
      const classesNeededToRecover =
        totalConducted > 0 && overallPercentage < 75
          ? Math.max(0, Math.ceil(3 * totalConducted - 4 * totalAttended))
          : 0;

      const isEligible = totalConducted > 0 && overallPercentage >= 75;

      // Fetch active campus circulars for students
      const circulars = await Circular.find({
        targetAudience: { $in: ["All", "Students"] },
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      // Fetch pending leave applications by this student
      let studentLeaves: any[] = [];
      if (targetStudentId) {
        studentLeaves = await Leave.find({ applicantId: targetStudentId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
      }

      // Fetch today's routines for this student's department/semester strictly for current IST day
      const { currentDay } = getIstCurrentTime();

      const routinesToday = await Routine.find({
        department: studentDept,
        semester: studentSem,
        section: studentSec,
        dayOfWeek: currentDay,
      })
        .populate("teacherId", "name email")
        .sort({ timeSlot: 1 })
        .lean();

      // STRICT: If no routines for currentDay (e.g. Sunday or rest day), do NOT fall back to other days
      const todayRoutines: any[] = [];
      for (const r of routinesToday) {
        if ((r as any).classes && Array.isArray((r as any).classes) && (r as any).classes.length > 0) {
          for (const c of (r as any).classes) {
            todayRoutines.push({
              _id: r._id.toString(),
              classId: c._id ? c._id.toString() : undefined,
              paperCode: c.paperCode || "",
              subject: c.subject,
              timeSlot: c.timeSlot,
              dayOfWeek: r.dayOfWeek,
              teacherName: c.teacherName || (c.teacherId as any)?.name || "Assigned Faculty",
            });
          }
        } else if ((r as any).subject) {
          todayRoutines.push({
            _id: r._id.toString(),
            paperCode: (r as any).paperCode || "",
            subject: (r as any).subject,
            timeSlot: (r as any).timeSlot,
            dayOfWeek: r.dayOfWeek,
            teacherName: (r as any).teacherId?.name || "Assigned Faculty",
          });
        }
      }

      return NextResponse.json({
        success: true,
        role: "Student",
        analytics: {
          totalAttended,
          totalConducted,
          overallPercentage,
          isEligible,
          allowedAbsences,
          classesNeededToRecover,
          subjects: subjectsList,
          recentCirculars: circulars,
          leaves: studentLeaves,
          todayRoutines,
        },
      });
    }

    // -------------------------------------------------------------
    // 2. TEACHER ANALYTICS
    // -------------------------------------------------------------
    if (role === "Teacher") {
      let teacherObjectId: Types.ObjectId | null = null;
      if (userId && Types.ObjectId.isValid(userId)) {
        teacherObjectId = new Types.ObjectId(userId);
      } else if (dbUser?._id) {
        teacherObjectId = dbUser._id as Types.ObjectId;
      }

      const { currentDay } = getIstCurrentTime();

      // Query routines assigned strictly for currentDay in IST (Asia/Kolkata)
      const routineQuery: Record<string, unknown> = { dayOfWeek: currentDay };
      if (teacherObjectId) {
        routineQuery.$or = [{ teacherId: teacherObjectId }, { "classes.teacherId": teacherObjectId }];
      } else if (department) {
        routineQuery.department = department;
      }

      // STRICT: No fallback to other days. If today is Sunday or no classes scheduled, return empty list []
      const todayRoutines = await Routine.find(routineQuery).lean();

      // Query recent attendance marked by this teacher or in this department
      const attendanceLogs = await Attendance.find(
        teacherObjectId ? { markedBy: teacherObjectId } : {}
      )
        .sort({ date: -1 })
        .limit(10)
        .populate("routineId", "subject department semester timeSlot")
        .populate("presentStudents", "name rollNumber")
        .populate("absentStudents", "name rollNumber email")
        .lean();

      // Collect defaulter alerts from recent absences
      const defaulterMap: Record<string, { name: string; roll: string; email: string; absences: number; percentage: string }> = {};

      for (const log of attendanceLogs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const absents = (log.absentStudents || []) as any[];
        for (const st of absents) {
          const id = st._id?.toString() || st.name;
          if (!defaulterMap[id]) {
            defaulterMap[id] = {
              name: st.name || "Student",
              roll: st.rollNumber || (st.email ? st.email.split("@")[0].toUpperCase() : "NO-ROLL"),
              email: st.email || "",
              absences: 1,
              percentage: "0.0%",
            };
          } else {
            defaulterMap[id].absences += 1;
          }
        }
      }

      // Calculate real mathematical attendance percentage for each defaulter from MongoDB
      for (const id of Object.keys(defaulterMap)) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const stObjId = new mongoose.Types.ObjectId(id);
          const studentLogs = await Attendance.find({
            $or: [{ presentStudents: stObjId }, { absentStudents: stObjId }],
          }).lean();

          let attended = 0;
          for (const l of studentLogs) {
            if (l.presentStudents.some((pId) => pId.toString() === id)) attended++;
          }
          const realPct = studentLogs.length > 0 ? ((attended / studentLogs.length) * 100).toFixed(1) + "%" : "0.0%";
          defaulterMap[id].percentage = realPct;
        }
      }

      const defaulterList = Object.values(defaulterMap).slice(0, 5);

      // Format today classes with real live status
      const formattedClasses: any[] = [];
      let classCounter = 0;
      for (const r of todayRoutines) {
        if ((r as any).classes && Array.isArray((r as any).classes) && (r as any).classes.length > 0) {
          const relevantClasses = teacherObjectId
            ? (r as any).classes.filter(
                (c: any) => c.teacherId?.toString() === teacherObjectId?.toString()
              )
            : (r as any).classes;

          const toDisplay = relevantClasses.length > 0 ? relevantClasses : (r as any).classes;

          for (const c of toDisplay) {
            classCounter++;
            const timing = computeClassStatus(c.timeSlot, r.dayOfWeek);

            formattedClasses.push({
              _id: r._id.toString(),
              routineId: r._id.toString(),
              classId: c._id ? c._id.toString() : undefined,
              code: c.paperCode || c.subject.split(" ")[0] || `CS-${500 + classCounter * 2}`,
              title: c.subject,
              time: c.timeSlot,
              department: r.department,
              academicYear:
                r.academicYear ||
                (r.semester <= 2
                  ? "1st Year"
                  : r.semester <= 4
                  ? "2nd Year"
                  : r.semester <= 6
                  ? "3rd Year"
                  : "4th Year"),
              semester: r.semester,
              section: r.section || "Section A",
              hall: `Hall ${r.semester}0${classCounter}`,
              status: timing.status,
              attendance: timing.attendance,
            });
          }
        } else if ((r as any).subject) {
          classCounter++;
          const timing = computeClassStatus((r as any).timeSlot || "", r.dayOfWeek);

          formattedClasses.push({
            _id: r._id.toString(),
            routineId: r._id.toString(),
            code: (r as any).paperCode || (r as any).subject.split(" ")[0] || `CS-${500 + classCounter * 2}`,
            title: (r as any).subject,
            time: (r as any).timeSlot,
            department: r.department,
            academicYear:
              r.academicYear ||
              (r.semester <= 2
                ? "1st Year"
                : r.semester <= 4
                ? "2nd Year"
                : r.semester <= 6
                ? "3rd Year"
                : "4th Year"),
            semester: r.semester,
            section: r.section || "Section A",
            hall: `Hall ${r.semester}0${classCounter}`,
            status: timing.status,
            attendance: timing.attendance,
          });
        }
      }

      return NextResponse.json({
        success: true,
        role: "Teacher",
        analytics: {
          todayClasses: formattedClasses,
          defaulters: defaulterList,
          attendanceLogsCount: attendanceLogs.length,
        },
      });
    }

    // -------------------------------------------------------------
    // 3. HOD ANALYTICS
    // -------------------------------------------------------------
    if (role === "HOD") {
      const canonicalDept = standardizeDepartment(department || "Bachelor of Computer Applications (BCA)");
      const deptVariants = getDepartmentVariants(canonicalDept);
      const deptName = canonicalDept;

      const [totalStudents, totalFaculty, departmentRoutines, pendingLeaves, recentAttendance] =
        await Promise.all([
          User.countDocuments({ role: "Student", department: { $in: deptVariants } }),
          User.countDocuments({ 
            role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)", "Teacher", "HOD"] }, 
            department: { $in: deptVariants } 
          }),
          Routine.find({ department: { $in: deptVariants } }).lean(),
          Leave.find({ department: deptName, status: "Pending" })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("applicantId", "name email rollNumber")
            .lean(),
          Attendance.find()
            .sort({ date: -1 })
            .limit(50)
            .populate("routineId", "department subject")
            .lean(),
        ]);

      // Calculate branch attendance percentage from recent attendance in this dept
      let deptPresent = 0;
      let deptTotal = 0;

      for (const att of recentAttendance) {
        const r = att.routineId as any;
        if (r?.department === deptName || !r?.department) {
          const presents = att.presentStudents?.length || 0;
          const absents = att.absentStudents?.length || 0;
          deptPresent += presents;
          deptTotal += presents + absents;
        }
      }

      const branchAttendanceRate =
        deptTotal > 0 ? ((deptPresent / deptTotal) * 100).toFixed(1) + "%" : "0.0%";

      const totalDeptSessions = departmentRoutines.reduce(
        (acc, r: any) => acc + (r.classes?.length || 1),
        0
      );

      const stats = [
        {
          label: "Branch Attendance",
          value: branchAttendanceRate,
          sub: `${deptName}`,
          color: "from-blue-500 to-indigo-600",
        },
        {
          label: "Active Faculty Today",
          value: `${totalFaculty} Faculty`,
          sub: "Department Registered Faculty",
          color: "from-cyan-500 to-blue-600",
        },
        {
          label: "Classes Scheduled",
          value: `${totalDeptSessions} Sessions`,
          sub: "Active Timetable Modules",
          color: "from-emerald-500 to-teal-600",
        },
        {
          label: "Pending Leave Requests",
          value: `${pendingLeaves.length}`,
          sub: "Requires HOD Sanction",
          color: "from-amber-500 to-orange-600",
        },
      ];

      return NextResponse.json({
        success: true,
        role: "HOD",
        department: deptName,
        analytics: {
          stats,
          pendingLeaves,
          studentCount: totalStudents,
          facultyCount: totalFaculty,
          routineCount: departmentRoutines.length,
        },
      });
    }

    // -------------------------------------------------------------
    // 4. PRINCIPAL ANALYTICS (SUPREME GOD-MODE)
    // -------------------------------------------------------------
    if (role === "Principal") {
      const [
        totalStudentsCount, 
        totalFacultyCount, 
        allRoutines, 
        allAttendance, 
        departmentsList, 
        allStudentsRaw,
        allTeachersRaw,
        allHodsRaw,
        pendingLeavesRaw
      ] = await Promise.all([
        User.countDocuments({ role: "Student" }),
        User.countDocuments({ 
          role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)", "Teacher", "HOD"] } 
        }),
        Routine.find().populate("teacherId", "name email").lean(),
        Attendance.find().sort({ date: -1 }).lean(),
        User.distinct("department"),
        User.find({ role: "Student" }).sort({ name: 1 }).lean(),
        User.find({ 
          role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)", "Teacher", "HOD"] } 
        }).sort({ name: 1 }).lean(),
        User.find({ 
          role: { $in: ["Head of Dept (HOD)", "HOD"] } 
        }).sort({ name: 1 }).lean(),
        Leave.find({ status: "Pending" })
          .sort({ createdAt: -1 })
          .populate("applicantId", "name email rollNumber department role profilePicture")
          .lean(),
      ]);

      // Calculate campus overall attendance
      let overallPresents = 0;
      let overallTotal = 0;
      const deptAttendanceMap: Record<string, { present: number; total: number }> = {};

      for (const att of allAttendance) {
        const presents = att.presentStudents?.length || 0;
        const absents = att.absentStudents?.length || 0;
        const total = presents + absents;
        overallPresents += presents;
        overallTotal += total;

        const dept = standardizeDepartment(att.department || "General Academic & Sciences");
        if (!deptAttendanceMap[dept]) {
          deptAttendanceMap[dept] = { present: 0, total: 0 };
        }
        deptAttendanceMap[dept].present += presents;
        deptAttendanceMap[dept].total += total;
      }

      const campusPercentage =
        overallTotal > 0 ? ((overallPresents / overallTotal) * 100).toFixed(1) + "%" : "0.0%";

      // Compute student-by-student attendance rates
      const studentMap = allStudentsRaw.map((st) => {
        let attended = 0;
        let total = 0;
        for (const att of allAttendance) {
          const isPres = att.presentStudents.some((id: any) => id.toString() === st._id.toString());
          const isAbs = att.absentStudents.some((id: any) => id.toString() === st._id.toString());
          if (isPres || isAbs) {
            total++;
            if (isPres) attended++;
          }
        }
        const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 0.0;
        return {
          _id: st._id.toString(),
          name: st.name,
          email: st.email,
          rollNumber: st.rollNumber || "N/A",
          department: standardizeDepartment(st.department || "General Academic & Sciences"),
          semester: st.semester || 1,
          section: st.section || "A",
          profilePicture: st.profilePicture || "",
          idCardSoftCopy: st.idCardSoftCopy || "",
          attendancePercentage: pct,
          totalClasses: total,
          attendedClasses: attended,
        };
      });

      // Map distinct departments strictly standardized
      const rawDeptNames = [
        ...departmentsList.map((d: string) => standardizeDepartment(d)),
        ...Object.keys(deptAttendanceMap).map((d: string) => standardizeDepartment(d)),
        ...STANDARD_DEPARTMENTS,
      ];
      const activeDeptNames = Array.from(new Set(rawDeptNames)).filter(Boolean);

      // Build structured Department Overview (HOD, Teachers list, Routines count)
      // Real-time Aggregation: faculty count dynamically reflects User.countDocuments(...)
      const departmentsOverview = await Promise.all(
        activeDeptNames.map(async (deptName) => {
          const variants = getDepartmentVariants(deptName);
          const hod = allHodsRaw.find((h) => isSameDepartment(h.department, deptName)) || null;
          const teachersInDept = allTeachersRaw.filter((t) => isSameDepartment(t.department, deptName));
          const deptRoutines = allRoutines.filter((r) => isSameDepartment(r.department, deptName));
          const deptStudents = studentMap.filter((s) => isSameDepartment(s.department, deptName));
          const stats = deptAttendanceMap[deptName];
          const pct = stats && stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) + "%" : "0.0%";

          // Real-time Aggregation: queries users.countDocuments(...) directly from main users collection
          const dynamicFacultyCount = await User.countDocuments({
            role: { $in: ["Faculty / Teacher", "Head of Dept (HOD)"] },
            department: { $in: variants },
          });

          return {
            name: deptName,
            hod: hod ? {
              _id: hod._id.toString(),
              name: hod.name,
              email: hod.email,
              phone: hod.phone || "",
              designation: hod.designation || "Head of Department",
              profilePicture: hod.profilePicture || "",
            } : null,
            teachingFacultyCount: Math.max(dynamicFacultyCount, teachersInDept.length),
            teachers: teachersInDept.map((t) => ({
              _id: t._id.toString(),
              name: t.name,
              email: t.email,
              designation: t.designation || (t.role === "Head of Dept (HOD)" ? "Head of Department" : "Faculty"),
              profilePicture: t.profilePicture || "",
              routinesCount: deptRoutines.reduce(
                (count, r: any) =>
                  count +
                  (r.classes
                    ? r.classes.filter((c: any) => c.teacherId?.toString() === t._id.toString()).length
                    : r.teacherId?._id?.toString() === t._id.toString()
                    ? 1
                    : 0),
                0
              ),
            })),
            studentCount: deptStudents.length,
            routinesCount: deptRoutines.reduce((acc, r: any) => acc + (r.classes?.length || 1), 0),
            attendanceRate: pct,
          };
        })
      );

      const stats = [
        {
          label: "Campus Overall Attendance",
          value: campusPercentage,
          change: "Real-time Biometric Ledger",
          trend: "up",
          glow: "rgba(56, 189, 248, 0.3)",
          color: "from-sky-500 to-blue-600",
        },
        {
          label: "Faculty Registered",
          value: `${totalFacultyCount} Members`,
          change: "Campus-Wide Active Faculty",
          trend: "neutral",
          glow: "rgba(168, 85, 247, 0.3)",
          color: "from-purple-500 to-indigo-600",
        },
        {
          label: "Active Departments",
          value: `${activeDeptNames.length} Units`,
          change: "Institutional Compliance",
          trend: "up",
          glow: "rgba(16, 185, 129, 0.3)",
          color: "from-emerald-500 to-teal-600",
        },
        {
          label: "Total Enrolled Scholars",
          value: `${totalStudentsCount} Students`,
          change: "Database Registered Cohort",
          trend: "up",
          glow: "rgba(245, 158, 11, 0.3)",
          color: "from-amber-500 to-orange-600",
        },
      ];

      return NextResponse.json({
        success: true,
        role: "Principal",
        analytics: {
          stats,
          departmentsOverview,
          allStudents: studentMap,
          allPendingLeaves: pendingLeavesRaw,
          totalStudents: totalStudentsCount,
          totalFaculty: totalFacultyCount,
          totalRoutines: allRoutines.reduce((acc, r: any) => acc + (r.classes?.length || 1), 0),
          activeDepartments: activeDeptNames,
        },
      });
    }

    return NextResponse.json({ success: true, message: "No role matched" });
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
    console.error("[API: /api/analytics] Error:", error);
    const message = error instanceof Error ? error.message : "Error aggregating analytics";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

