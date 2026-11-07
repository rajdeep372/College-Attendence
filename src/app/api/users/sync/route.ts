import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail, 
  deriveDepartment,
  deriveRollNumber,
  getRoleDashboardPath 
} from "@/lib/auth-rbac";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    let bodyData: {
      clerkId?: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      department?: string;
      rollNumber?: string;
      profilePicture?: string;
    } = {};

    try {
      bodyData = await req.json();
    } catch {
      // Body may be empty if frontend triggers auto-sync from Clerk session
    }

    let clerkId = bodyData.clerkId;
    let name = bodyData.name;
    let email = bodyData.email;
    let profilePicture = bodyData.profilePicture;
    let metaDept = bodyData.department;
    let metaRoll = bodyData.rollNumber;

    if (!clerkId || !email) {
      try {
        const clerkUser = await currentUser();
        if (clerkUser) {
          clerkId = clerkId || clerkUser.id;
          name =
            name ||
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            clerkUser.username ||
            "Academic User";
          email = email || clerkUser.emailAddresses?.[0]?.emailAddress;
          profilePicture = profilePicture || clerkUser.imageUrl;
          metaDept = metaDept || (clerkUser.publicMetadata as { department?: string })?.department;
          metaRoll = metaRoll || (clerkUser.publicMetadata as { rollNumber?: string })?.rollNumber;
        }
      } catch (err) {
        console.warn("[Sync] Clerk currentUser retrieval note:", err);
      }
    }

    if (!clerkId || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: clerkId and email are required to sync user.",
        },
        { status: 400 }
      );
    }

    // Strict Institutional Email Validation (Reject @gmail.com, etc.)
    const emailValidation = validateInstitutionalEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: emailValidation.error,
          policy: "Official college accounts only. Consumer email domains are prohibited.",
        },
        { status: 403 }
      );
    }

    // Dynamic role, department, and roll number derivation
    const autoAssignedRole: UserRole =
      bodyData.role || emailValidation.role || deriveRoleFromEmail(email);
    const department = deriveDepartment(email, metaDept);
    const rollNumber = deriveRollNumber(email, autoAssignedRole, metaRoll);
    const phone = bodyData.phone || "";

    // Upsert User in MongoDB with exact institutional credentials
    const syncedUser = await User.findOneAndUpdate(
      { clerkId },
      {
        clerkId,
        name: name || "Campus Scholar",
        email: email.toLowerCase().trim(),
        phone,
        role: autoAssignedRole,
        department,
        rollNumber,
        profilePicture: profilePicture || "",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Clerk user synchronized with auto-assigned institutional role and department",
        role: autoAssignedRole,
        department,
        rollNumber,
        redirectPath: getRoleDashboardPath(autoAssignedRole),
        user: syncedUser,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API: /api/users/sync] Error syncing user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to sync user with database";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");
    const role = searchParams.get("role");
    const department = searchParams.get("department");

    if (clerkId) {
      const user = await User.findOne({ clerkId });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, user });
    }

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (department) filter.department = department;

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Database query error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
