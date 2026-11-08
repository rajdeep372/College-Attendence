import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import { isPrincipalSuperAdmin } from "@/lib/auth-rbac";

/**
 * Ensures only verified Principal (Admin) can manage staff whitelist
 */
async function verifyPrincipalRequester() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return { authorized: false, error: "Authentication required.", status: 401 };
  }

  const role = (clerkUser.publicMetadata as { role?: string })?.role;
  const email = (clerkUser.emailAddresses?.[0]?.emailAddress || "").toLowerCase().trim();

  const isPrincipal =
    role === "Principal (Admin)" ||
    role === "Principal" ||
    email === "chatterjeer477@gmail.com" ||
    isPrincipalSuperAdmin(email);

  if (!isPrincipal) {
    return {
      authorized: false,
      error: "Strict Institutional Access Violation: Only Principal (Admin) can manage authorized staff.",
      status: 403,
    };
  }

  return { authorized: true, clerkUser, email };
}

/**
 * GET /api/admin/staff
 * Real-time list of authorized HODs and Teachers from MongoDB authorizedstaffs collection
 */
export async function GET() {
  try {
    const authCheck = await verifyPrincipalRequester();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectToDatabase();

    const staffDocs = await mongoose.connection
      .collection("authorizedstaffs")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: staffDocs.length,
      staff: staffDocs.map((s) => ({
        _id: s._id.toString(),
        email: s.email,
        role: s.role,
        name: s.name || "",
        department: s.department || "",
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
      })),
    });
  } catch (error: unknown) {
    console.error("[API: GET /api/admin/staff] Error:", error);
    const msg = error instanceof Error ? error.message : "Error fetching authorized staff";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff
 * Accepts { email, role, name, department }, converts email to lowercase,
 * and saves to the authorizedstaffs MongoDB collection.
 */
export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyPrincipalRequester();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const body = await req.json();
    const { email, role, name = "", department = "" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is strictly required." },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Full Official Name is required for institutional staff records." },
        { status: 400 }
      );
    }

    if (!department || !department.trim()) {
      return NextResponse.json(
        { success: false, error: "Academic Department is required for curriculum mapping." },
        { status: 400 }
      );
    }

    // Role must be strictly 'Faculty / Teacher' or 'Head of Dept (HOD)'
    const validRoles = ["Faculty / Teacher", "Head of Dept (HOD)"];
    let cleanRole = (role || "").trim();

    if (!validRoles.includes(cleanRole)) {
      if (cleanRole.toLowerCase().includes("hod") || cleanRole.toLowerCase().includes("head")) {
        cleanRole = "Head of Dept (HOD)";
      } else if (cleanRole.toLowerCase().includes("teacher") || cleanRole.toLowerCase().includes("faculty")) {
        cleanRole = "Faculty / Teacher";
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Role must be strictly 'Faculty / Teacher' or 'Head of Dept (HOD)'.",
          },
          { status: 400 }
        );
      }
    }

    const cleanEmail = email.toLowerCase().trim();

    await connectToDatabase();

    const now = new Date();
    await mongoose.connection.collection("authorizedstaffs").updateOne(
      { email: cleanEmail },
      {
        $set: {
          email: cleanEmail,
          role: cleanRole,
          name: name.trim(),
          department: department.trim(),
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Sync role in User collection if user already exists
    await User.updateOne(
      { email: cleanEmail },
      {
        $set: {
          role: cleanRole,
          ...(department ? { department: department.trim() } : {}),
        },
      }
    );

    console.log(`[Admin Staff Whitelist] Successfully authorized ${cleanEmail} as '${cleanRole}'`);

    return NextResponse.json({
      success: true,
      message: `Successfully whitelisted ${cleanEmail} as ${cleanRole}.`,
      staff: {
        email: cleanEmail,
        role: cleanRole,
        name: name.trim(),
        department: department.trim(),
      },
    });
  } catch (error: unknown) {
    console.error("[API: POST /api/admin/staff] Error:", error);
    const msg = error instanceof Error ? error.message : "Error saving authorized staff";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/staff
 * Removes an email from the authorizedstaffs MongoDB collection.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await verifyPrincipalRequester();
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status }
      );
    }

    let emailToDelete = req.nextUrl.searchParams.get("email");

    if (!emailToDelete) {
      try {
        const body = await req.json();
        emailToDelete = body?.email;
      } catch {
        // body was empty or not json
      }
    }

    if (!emailToDelete || !emailToDelete.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required for revocation." },
        { status: 400 }
      );
    }

    const cleanEmail = emailToDelete.toLowerCase().trim();

    // Prevent accidental self-deletion of Principal
    if (cleanEmail === "chatterjeer477@gmail.com") {
      return NextResponse.json(
        { success: false, error: "The Supreme Principal cannot be revoked from authorized staff." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await mongoose.connection
      .collection("authorizedstaffs")
      .deleteOne({ email: cleanEmail });

    console.log(`[Admin Staff Whitelist] Revoked whitelist access for ${cleanEmail}`);

    return NextResponse.json({
      success: true,
      message: `Successfully revoked access for ${cleanEmail}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error: unknown) {
    console.error("[API: DELETE /api/admin/staff] Error:", error);
    const msg = error instanceof Error ? error.message : "Error revoking authorized staff";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

