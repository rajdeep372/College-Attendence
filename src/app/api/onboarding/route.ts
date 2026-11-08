import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import Routine from "@/models/Routine";
import AuthorizedStaff from "@/models/AuthorizedStaff";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { 
  getRoleDashboardPath, 
  isPersonalEmail, 
  isPrincipalSuperAdmin,
  STRICT_SSO_ERROR_MESSAGE 
} from "@/lib/auth-rbac";
import { determineUserRole, isWhitelistedStaff } from "@/lib/server-rbac";

export async function GET() {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Backend-Enforced Zero-Trust Role Determination
    const assignedRole: UserRole = await determineUserRole(normalizedEmail);
    const isPersonal = isPersonalEmail(normalizedEmail);
    const isWhitelisted = await isWhitelistedStaff(normalizedEmail);
    const isBlocked = isPersonal && assignedRole !== "Principal" && !isWhitelisted;

    const dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();
    const isSupremePrincipal = normalizedEmail === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(normalizedEmail);

    return NextResponse.json({
      success: true,
      email,
      assignedRole,
      isPersonal,
      isBlocked,
      onboarded: isSupremePrincipal ? true : Boolean(dbUser?.onboarded),
      user: dbUser,
      targetDashboard: getRoleDashboardPath(assignedRole),
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
    const normalizedEmail = email.toLowerCase().trim();

    // =========================================================================
    // STRICT ZERO-TRUST BACKEND-ENFORCED RBAC
    // 1. Principal Hardcode: strictly check if email matches chatterjeer477@gmail.com
    // 2. AuthorizedStaff Whitelist: query AuthorizedStaff collection for non-principals
    // 3. Default Student Fallback: automatically & permanently assign 'Student' role
    // =========================================================================
    let finalRole: UserRole = "Student";

    if (normalizedEmail === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(normalizedEmail)) {
      finalRole = "Principal";
    } else {
      const staff = await AuthorizedStaff.findOne({ email: normalizedEmail }).lean();
      if (staff && staff.role && ["Teacher", "HOD", "Principal"].includes(staff.role)) {
        finalRole = staff.role as UserRole;
      } else {
        finalRole = "Student";
      }
    }

    // Strict Role-Based Institutional Email Validation:
    // Personal emails (@gmail.com, etc.) are strictly prohibited for non-whitelisted accounts
    const isPersonal = isPersonalEmail(normalizedEmail);
    const isWhitelisted = await isWhitelistedStaff(normalizedEmail);

    if (isPersonal && finalRole !== "Principal" && !isWhitelisted) {
      return NextResponse.json(
        { 
          success: false, 
          error: STRICT_SSO_ERROR_MESSAGE,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
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

    const cleanDesignation = finalRole === "Principal"
      ? "Principal (Admin)"
      : finalRole !== "Student"
      ? designation.trim() || (finalRole === "HOD" ? "Head of Department (HOD)" : "Faculty Instructor")
      : "";

    const updatePayload: Record<string, unknown> = {
      clerkId: clerkUser.id,
      name: fullName,
      email: normalizedEmail,
      phone: phone.trim(),
      role: finalRole,
      department: department.trim(),
      rollNumber: finalRole === "Student" ? rollNumber.trim().toUpperCase() : (finalRole === "Principal" ? "ADM-PRIN" : (rollNumber || "").trim().toUpperCase()),
      batchDuration: finalRole === "Student" ? (batchDuration || "2024-2028").trim() : undefined,
      academicYear: finalRole === "Student" ? resolvedAcademicYear : undefined,
      semester: finalRole === "Student" ? Math.max(1, Math.min(12, Number(semester) || 1)) : 1,
      section: cleanSection,
      designation: cleanDesignation,
      onboarded: true,
      profilePicture: clerkUser.imageUrl || "",
    };

    const savedUser = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // =========================================================================
    // 5. SECURE CLERK SYNC
    // Update user's Clerk publicMetadata.role via the backend integration
    // =========================================================================
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          role: finalRole,
          department: department.trim(),
          ...(finalRole === "Student" && rollNumber ? { rollNumber: rollNumber.trim().toUpperCase() } : {}),
        },
      });
      console.log(`[Clerk Sync] Successfully synced publicMetadata.role='${finalRole}' for Clerk user ${clerkUser.id}`);
    } catch (clerkSyncErr) {
      console.warn("[Clerk Sync] Warning: Could not update Clerk publicMetadata:", clerkSyncErr);
    }

    // If teacher/HOD claimed an unassigned routine slot, link matching routine classes
    if (claimedFacultyName && (finalRole === "Teacher" || finalRole === "HOD")) {
      const trimmedClaim = claimedFacultyName.trim();
      try {
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
      role: finalRole,
      user: savedUser,
    });
  } catch (error: unknown) {
    console.error("[API: /api/onboarding POST] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to record onboarding details.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
