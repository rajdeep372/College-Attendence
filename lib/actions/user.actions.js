"use server";

import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "../mongodb.js";
import User from "../../src/models/User";

/**
 * Server action to fetch current logged-in user from MongoDB using Clerk ID
 */
export async function getCurrentUser() {
  try {
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
    } catch {
      return null;
    }
    if (!clerkUser) return null;

    await connectToDatabase();

    let dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();

    if (!dbUser) {
      const primaryEmail =
        clerkUser.emailAddresses?.[0]?.emailAddress || "user@college.edu";
      const fullName =
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        clerkUser.username ||
        "Campus Scholar";

      const metaRole = clerkUser.publicMetadata?.role;
      const initialRole = metaRole || "Student";

      const newUser = await User.create({
        clerkId: clerkUser.id,
        name: fullName,
        email: primaryEmail.toLowerCase().trim(),
        role: initialRole,
        department: "Computer Science",
        profilePicture: clerkUser.imageUrl || "",
      });

      dbUser = newUser.toObject();
    }

    if (!dbUser) return null;

    return {
      _id: dbUser._id.toString(),
      clerkId: dbUser.clerkId,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || "",
      role: dbUser.role,
      department: dbUser.department || "Computer Science",
      profilePicture: dbUser.profilePicture || clerkUser.imageUrl || "",
    };
  } catch (error) {
    console.error("[Server Action] Error fetching user:", error);
    return null;
  }
}

export async function updateUserRole(clerkId, newRole) {
  try {
    await connectToDatabase();
    const updated = await User.findOneAndUpdate(
      { clerkId },
      { role: newRole },
      { new: true }
    ).lean();

    if (!updated) return null;

    return {
      _id: updated._id.toString(),
      clerkId: updated.clerkId,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || "",
      role: updated.role,
      department: updated.department || "Computer Science",
      profilePicture: updated.profilePicture || "",
    };
  } catch (error) {
    console.error("[Server Action] Error updating role:", error);
    return null;
  }
}

export async function getUserByClerkId(clerkId) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId }).lean();
    if (!user) return null;

    return {
      _id: user._id.toString(),
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      department: user.department || "Computer Science",
      profilePicture: user.profilePicture || "",
    };
  } catch (error) {
    console.error("[Server Action] Error getting user by clerkId:", error);
    return null;
  }
}

