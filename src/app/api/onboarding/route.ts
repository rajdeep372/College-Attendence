import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import Routine from "@/models/Routine";
import { currentUser } from "@clerk/nextjs/server";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail, 
  getRoleDashboardPath,
  isPrincipalSuperAdmin 
} from "@/lib/auth-rbac";

export async function GET() {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isGodMode = isPrincipalSuperAdmin(email);
    const validation = validateInstitutionalEmail(email);

    let dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();

    return NextResponse.json({
      success: true,
      email,
      validation,
      onboarded: isGodMode || Boolean(dbUser?.onboarded),
      user: dbUser,
      targetDashboard: isGodMode ? "/dashboard/principal" : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error querying onboarding state";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to complete onboarding." },
        { status: 401 }
      );
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const emailValidation = validateInstitutionalEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: emailValidation.error || "Personal email addresses are prohibited." 
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      role: requestedRole,
      department,
      rollNumber,
      batchDuration,
      academicYear,
      semester = 1,
      section = "Section A",
      designation = "",
      phone = "",
      claimedFacultyName,
    } = body;

    if (!department || !department.trim()) {
      return NextResponse.json(
        { success: false, error: "Academic Department is mandatory." },
        { status: 400 }
      );
    }

    // Determine final role
    let finalRole: UserRole = "Student";
    if (requestedRole === "Principal") {
      finalRole = "Principal";
    } else if (
      requestedRole === "HOD" ||
      (designation && designation.toLowerCase().includes("head of department"))
    ) {
      finalRole = "HOD";
    } else if (requestedRole === "Teacher") {
      finalRole = "Teacher";
    } else {
      // Check email derivation or default
      finalRole = deriveRoleFromEmail(email);
    }

    if (finalRole === "Student") {
      if (!rollNumber || !rollNumber.trim()) {
        return NextResponse.json(
          { success: false, error: "Roll Number is strictly required for students." },
          { status: 400 }
        );
      }
    }

    const fullName = name && name.trim()
      ? name.trim()
      : `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Academic Scholar";

    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear && finalRole === "Student") {
      const semNum = Number(semester) || 1;
      resolvedAcademicYear = semNum <= 2 ? "1st Year" : semNum <= 4 ? "2nd Year" : semNum <= 6 ? "3rd Year" : "4th Year";
    }

    const cleanSection = finalRole === "Student"
      ? (section.toString().toUpperCase().startsWith("SECTION") ? section.toString().trim() : `Section ${section.toString().trim().toUpperCase()}`)
      : "";

    const updatePayload: Record<string, unknown> = {
      clerkId: clerkUser.id,
      name: fullName,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: finalRole,
      department: department.trim(),
      rollNumber: finalRole === "Student" ? rollNumber.trim().toUpperCase() : (rollNumber || "").trim().toUpperCase(),
      batchDuration: finalRole === "Student" ? (batchDuration || "2024-2028").trim() : undefined,
      academicYear: finalRole === "Student" ? resolvedAcademicYear : undefined,
      semester: finalRole === "Student" ? Math.max(1, Math.min(12, Number(semester) || 1)) : 1,
      section: cleanSection,
      designation: finalRole !== "Student" ? designation.trim() : "",
      onboarded: true,
      profilePicture: clerkUser.imageUrl || "",
    };

    const savedUser = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If teacher/HOD claimed an unassigned routine slot, link matching routine classes
    if (claimedFacultyName && (finalRole === "Teacher" || finalRole === "HOD")) {
      const trimmedClaim = claimedFacultyName.trim();
      try {
        // 1. Update day-grouped routines
        await Routine.updateMany(
          {
            department: department.trim(),
            "classes.teacherName": new RegExp(`^${trimmedClaim}$`, "i"),
          },
          {
            $set: {
              "classes.$[elem].teacherId": savedUser._id,
              "classes.$[elem].teacherName": savedUser.name,
              "classes.$[elem].isUnclaimed": false,
            },
          },
          {
            arrayFilters: [{ "elem.teacherName": new RegExp(`^${trimmedClaim}$`, "i") }],
          }
        );

        // 2. Update legacy routine fields if any
        await Routine.updateMany(
          {
            department: department.trim(),
            teacherName: new RegExp(`^${trimmedClaim}$`, "i"),
          },
          {
            $set: {
              teacherId: savedUser._id,
              teacherName: savedUser.name,
              isUnclaimed: false,
            },
          }
        );

        console.log(`[API: /api/onboarding] Linked unclaimed routine slots for '${trimmedClaim}' to teacher ${savedUser._id} (${savedUser.name}).`);
      } catch (claimErr) {
        console.warn("[API: /api/onboarding] Failed to link routine slots:", claimErr);
      }
    }

    const targetDashboard = getRoleDashboardPath(finalRole);

    return NextResponse.json({
      success: true,
      message: "Institutional profile verified and registered into official college ledger.",
      targetDashboard,
      user: savedUser,
    });
  } catch (error: unknown) {
    console.error("[API: /api/onboarding POST] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to record onboarding details.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
