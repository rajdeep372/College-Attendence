import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AuthorizedStaff from "@/models/AuthorizedStaff";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { isPrincipalSuperAdmin } from "@/lib/auth-rbac";
import { normalizeStaffRole } from "@/lib/server-rbac";
import { standardizeDepartment } from "@/lib/departments";

export async function GET() {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isPrincipal = email.toLowerCase().trim() === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(email);

    if (!isPrincipal) {
      const dbUser = await User.findOne({ clerkId: clerkUser.id });
      if (dbUser?.role !== "Principal") {
        return NextResponse.json(
          { success: false, error: "Only the Principal can view authorized staff whitelist." },
          { status: 403 }
        );
      }
    }

    const staffList = await AuthorizedStaff.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      count: staffList.length,
      staff: staffList,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error querying staff whitelist";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const callerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isPrincipal = callerEmail.toLowerCase().trim() === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(callerEmail);

    if (!isPrincipal) {
      const dbUser = await User.findOne({ clerkId: clerkUser.id });
      if (dbUser?.role !== "Principal") {
        return NextResponse.json(
          { success: false, error: "Only the Principal can authorize staff members." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { email, role, name = "", department = "" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid staff email address is required." },
        { status: 400 }
      );
    }

    const normalizedRoleInfo = normalizeStaffRole(role);
    if (!role || normalizedRoleInfo.role === "Student") {
      return NextResponse.json(
        { success: false, error: "Role must be 'Teacher', 'Faculty', 'HOD', or 'Principal'." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const standardizedDept = standardizeDepartment(department);

    const staff = await AuthorizedStaff.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        role: normalizedRoleInfo.displayRole || role,
        name: name.trim(),
        department: standardizedDept,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync to User if exists
    await User.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          role: normalizedRoleInfo.role,
          department: standardizedDept,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully whitelisted ${normalizedEmail} as ${role}.`,
      staff,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error updating staff whitelist";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const callerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const isPrincipal = callerEmail.toLowerCase().trim() === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(callerEmail);

    if (!isPrincipal) {
      return NextResponse.json(
        { success: false, error: "Only the Principal can remove whitelisted staff." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const emailToDelete = searchParams.get("email");

    if (!emailToDelete) {
      return NextResponse.json(
        { success: false, error: "Email query parameter is required." },
        { status: 400 }
      );
    }

    await AuthorizedStaff.findOneAndDelete({ email: emailToDelete.toLowerCase().trim() });

    return NextResponse.json({
      success: true,
      message: `Removed ${emailToDelete} from authorized staff whitelist.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error deleting staff";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

