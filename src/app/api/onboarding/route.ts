import mongoose from "mongoose";
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
import { resolveInstitutionalRole } from "@/lib/server-rbac";

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
    const roleInfo = await resolveInstitutionalRole(normalizedEmail);
    const assignedRole: UserRole = roleInfo.role;
    const isPersonal = isPersonalEmail(normalizedEmail);
    const isBlocked = isPersonal && !roleInfo.isWhitelisted;

    const dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();

    return NextResponse.json({
      success: true,
      email,
      assignedRole,
      displayRole: roleInfo.displayRole,
      isPersonal,
      isBlocked,
      isWhitelisted: roleInfo.isWhitelisted,
      onboarded: Boolean(dbUser?.onboarded),
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

    // 1. Universal Backend Role Resolution (The Gatekeeper)
    // Ignore any role sent from the frontend. Resolve role strictly on the server:
    const clerkUserEmail = (clerkUser.emailAddresses?.[0]?.emailAddress || "").toLowerCase().trim();

    let assignedRole: UserRole = "Student";

    // Check 1: If email matches principal, lock assignedRole = 'Principal (Admin)'
    if (clerkUserEmail === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(clerkUserEmail)) {
      assignedRole = "Principal (Admin)";
    } else {
      // Check 2: Query await mongoose.connection.collection('authorizedstaffs').findOne({ email: clerkUserEmail })
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexQuery = new RegExp(`^${escapeRegex(clerkUserEmail)}$`, "i");

      let staffDoc = null;
      if (mongoose.connection?.db) {
        staffDoc = await mongoose.connection.collection("authorizedstaffs").findOne({
          $or: [{ email: clerkUserEmail }, { email: regexQuery }],
        });
      }

      if (!staffDoc) {
        staffDoc = await AuthorizedStaff.findOne({
          $or: [{ email: clerkUserEmail }, { email: regexQuery }],
        }).lean();
      }

      if (staffDoc && staffDoc.role) {
        const rawRole = staffDoc.role.trim();
        if (rawRole.toLowerCase().includes("hod") || rawRole.toLowerCase().includes("head")) {
          assignedRole = "Head of Dept (HOD)";
        } else if (rawRole.toLowerCase().includes("faculty") || rawRole.toLowerCase().includes("teacher")) {
          assignedRole = "Faculty / Teacher";
        } else {
          assignedRole = rawRole as UserRole;
        }
      } else {
        // Check 3: If NO document is found, forcefully and permanently default to 'Student'
        assignedRole = "Student";
      }
    }

    // Strict Role-Based Institutional Email Validation:
    const isPersonal = isPersonalEmail(clerkUserEmail);
    const isAuthorizedStaffOrPrincipal = assignedRole !== "Student";
    if (isPersonal && !isAuthorizedStaffOrPrincipal) {
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

    const isStudent = assignedRole === "Student";
    const isPrincipal = assignedRole === "Principal (Admin)" || assignedRole === "Principal";
    const isTeacherOrHod = !isStudent && !isPrincipal;

    if (isStudent && (!rollNumber || !rollNumber.trim())) {
      return NextResponse.json(
        { success: false, error: "Roll Number is strictly required for students." },
        { status: 400 }
      );
    }

    const fullName = name && name.trim()
      ? name.trim()
      : `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Academic Scholar";

    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear && isStudent) {
      const semNum = Number(semester) || 1;
      resolvedAcademicYear = semNum <= 2 ? "1st Year" : semNum <= 4 ? "2nd Year" : semNum <= 6 ? "3rd Year" : "4th Year";
    }

    const cleanSection = isStudent
      ? (section.toString().toUpperCase().startsWith("SECTION") ? section.toString().trim() : `Section ${section.toString().trim().toUpperCase()}`)
      : "";

    const cleanDesignation = isPrincipal
      ? "Principal (Admin)"
      : isTeacherOrHod
      ? designation.trim() || (assignedRole === "Head of Dept (HOD)" ? "Head of Department (HOD)" : "Faculty Instructor")
      : "";

    const cleanRoll = isStudent
      ? rollNumber.trim().toUpperCase()
      : isPrincipal
      ? "ADM-PRIN"
      : (rollNumber || "").trim().toUpperCase();

    // 2. Proper DB Profile Sync (The Connection)
    // Upsert operational profile into main users MongoDB collection with assignedRole
    const updatePayload: Record<string, unknown> = {
      clerkId: clerkUser.id,
      email: clerkUserEmail,
      name: fullName,
      phone: phone.trim(),
      role: assignedRole,
      department: department.trim(),
      rollNumber: cleanRoll,
      batchDuration: isStudent ? (batchDuration || "2024-2028").trim() : undefined,
      academicYear: isStudent ? resolvedAcademicYear : undefined,
      semester: isStudent ? Math.max(1, Math.min(12, Number(semester) || 1)) : 1,
      section: cleanSection,
      designation: cleanDesignation,
      onboarded: true,
      profilePicture: clerkUser.imageUrl || "",
    };

    const savedUser = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { 
        $set: updatePayload,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Immutable Clerk Sync & Auto-Routing
    // Update clerkClient.users.updateUserMetadata with publicMetadata: { role: assignedRole }
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          role: assignedRole,
          onboarded: true,
          department: department.trim(),
          ...(isStudent && cleanRoll ? { rollNumber: cleanRoll } : {}),
        },
      });
      console.log(`[Clerk Sync] Successfully synced publicMetadata.role='${assignedRole}' for Clerk user ${clerkUser.id}`);
    } catch (clerkSyncErr) {
      console.warn("[Clerk Sync] Warning: Could not update Clerk publicMetadata:", clerkSyncErr);
    }

    // Link routine classes if teacher/HOD claimed an unassigned routine slot
    if (claimedFacultyName && isTeacherOrHod) {
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
      } catch (claimErr) {
        console.warn("[API: /api/onboarding] Failed to link routine slots:", claimErr);
      }
    }

    const targetDashboard = getRoleDashboardPath(assignedRole);

    return NextResponse.json({
      success: true,
      message: "Institutional profile verified and registered into official college ledger.",
      targetDashboard,
      role: assignedRole,
      user: savedUser,
    });
  } catch (error: unknown) {
    console.error("[API: /api/onboarding POST] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to record onboarding details.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
