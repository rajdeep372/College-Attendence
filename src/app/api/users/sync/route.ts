import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { UserRole } from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // 1. Establish database connection
    await connectToDatabase();

    // 2. Parse request body if provided
    let bodyData: {
      clerkId?: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      department?: string;
      profilePicture?: string;
    } = {};

    try {
      bodyData = await req.json();
    } catch {
      // Body may be empty if frontend triggers auto-sync from Clerk session
    }

    // 3. Check for Clerk session if fields not explicitly provided in body
    let clerkId = bodyData.clerkId;
    let name = bodyData.name;
    let email = bodyData.email;
    let profilePicture = bodyData.profilePicture;

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
        }
      } catch (err) {
        console.warn("[Sync] Clerk currentUser retrieval note:", err);
      }
    }

    // 4. Validate essential attributes
    if (!clerkId || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: clerkId and email are required to sync user.",
        },
        { status: 400 }
      );
    }

    // Default role assignment: "Student" unless provided as a valid enum
    const validRoles: UserRole[] = ["Principal", "HOD", "Teacher", "Student"];
    const role: UserRole =
      bodyData.role && validRoles.includes(bodyData.role)
        ? bodyData.role
        : "Student";

    const department = bodyData.department || "Computer Science";
    const phone = bodyData.phone || "";

    // 5. Upsert User in MongoDB
    const syncedUser = await User.findOneAndUpdate(
      { clerkId },
      {
        clerkId,
        name: name || "Campus Scholar",
        email: email.toLowerCase().trim(),
        phone,
        role,
        department,
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
        message: "Clerk user successfully synchronized with MongoDB",
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

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(50);

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

