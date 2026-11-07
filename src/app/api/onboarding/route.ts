import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
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
      semester = 1,
      section = "A",
      designation = "",
      phone = "",
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

    const updatePayload = {
      clerkId: clerkUser.id,
      name: fullName,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: finalRole,
      department: department.trim(),
      rollNumber: finalRole === "Student" ? rollNumber.trim().toUpperCase() : (rollNumber || "").trim().toUpperCase(),
      semester: finalRole === "Student" ? Math.max(1, Math.min(12, Number(semester) || 1)) : 1,
      section: finalRole === "Student" ? (section || "A").trim().toUpperCase() : "",
      designation: finalRole !== "Student" ? designation.trim() : "",
      onboarded: true,
      profilePicture: clerkUser.imageUrl || "",
    };

    const savedUser = await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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

