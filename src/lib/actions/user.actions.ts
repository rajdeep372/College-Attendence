"use server";

import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser, UserRole } from "@/models/User";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail 
} from "@/lib/auth-rbac";

export interface SerializedUser {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  profilePicture: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetches the currently authenticated Clerk user's profile and role from MongoDB.
 * Performs Smart Auto-Assignment (Zero Onboarding) based on institutional email prefix.
 */
export async function getCurrentUser(): Promise<SerializedUser | null> {
  try {
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
    } catch {
      // In static prerender or when request context is unavailable
      return null;
    }

    if (!clerkUser) {
      return null;
    }

    await connectToDatabase();

    const primaryEmail =
      clerkUser.emailAddresses?.[0]?.emailAddress || "user@college.edu";
    const fullName =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      clerkUser.username ||
      "Academic Scholar";

    // Validate institutional email
    const emailValidation = validateInstitutionalEmail(primaryEmail);
    // Auto-derive role based on email prefix (digits = Student, letters = Teacher/HOD/Principal)
    const derivedRole: UserRole = emailValidation.valid && emailValidation.role
      ? emailValidation.role
      : deriveRoleFromEmail(primaryEmail);

    // Query user by clerkId
    let dbUser = await User.findOne({ clerkId: clerkUser.id }).lean<IUser>();

    // If user not in MongoDB yet, auto-provision with derived role
    if (!dbUser) {
      const newUser = await User.create({
        clerkId: clerkUser.id,
        name: fullName,
        email: primaryEmail.toLowerCase().trim(),
        role: derivedRole,
        department: "Computer Science",
        profilePicture: clerkUser.imageUrl || "",
      });

      dbUser = newUser.toObject();
    } else if (dbUser.role !== derivedRole && derivedRole !== "Student") {
      // If user was previously default student but email prefix identifies them as Faculty/HOD/Principal, align role
      await User.updateOne({ _id: dbUser._id }, { $set: { role: derivedRole } });
      dbUser.role = derivedRole;
    }

    if (!dbUser) return null;

    // Return serializable plain object for Next.js Server Components
    return {
      _id: dbUser._id.toString(),
      clerkId: dbUser.clerkId,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || "",
      role: dbUser.role,
      department: dbUser.department || "Computer Science",
      profilePicture: dbUser.profilePicture || clerkUser.imageUrl || "",
      createdAt: dbUser.createdAt ? dbUser.createdAt.toISOString() : undefined,
      updatedAt: dbUser.updatedAt ? dbUser.updatedAt.toISOString() : undefined,
    };
  } catch (error) {
    console.error("[UserAction: getCurrentUser] Error fetching user:", error);
    return null;
  }
}

/**
 * Update the user's role in MongoDB
 */
export async function updateUserRole(
  clerkId: string,
  newRole: UserRole
): Promise<SerializedUser | null> {
  try {
    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate(
      { clerkId },
      { role: newRole },
      { new: true }
    ).lean<IUser>();

    if (!updatedUser) return null;

    return {
      _id: updatedUser._id.toString(),
      clerkId: updatedUser.clerkId,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      role: updatedUser.role,
      department: updatedUser.department || "Computer Science",
      profilePicture: updatedUser.profilePicture || "",
    };
  } catch (error) {
    console.error("[UserAction: updateUserRole] Error updating role:", error);
    return null;
  }
}

/**
 * Fetch any user by their Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<SerializedUser | null> {
  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId }).lean<IUser>();
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
    console.error("[UserAction: getUserByClerkId] Error:", error);
    return null;
  }
}
