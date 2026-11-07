"use server";

import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser, UserRole } from "@/models/User";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail,
  deriveDepartment,
  deriveRollNumber
} from "@/lib/auth-rbac";

export interface SerializedUser {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  rollNumber: string;
  profilePicture: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetches the currently authenticated Clerk user's profile and role from MongoDB.
 * Performs Smart Auto-Assignment (Zero Onboarding) based on institutional email prefix,
 * dynamically reading department and roll number without static hardcoded fallbacks.
 */
export async function getCurrentUser(): Promise<SerializedUser | null> {
  try {
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
    } catch {
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
    const derivedRole: UserRole = emailValidation.valid && emailValidation.role
      ? emailValidation.role
      : deriveRoleFromEmail(primaryEmail);

    const metaDept = (clerkUser.publicMetadata as { department?: string })?.department;
    const metaRoll = (clerkUser.publicMetadata as { rollNumber?: string })?.rollNumber;

    const dynamicDepartment = deriveDepartment(primaryEmail, metaDept);
    const dynamicRoll = deriveRollNumber(primaryEmail, derivedRole, metaRoll);

    // Query user by clerkId
    let dbUser = await User.findOne({ clerkId: clerkUser.id }).lean<IUser>();

    // If user not in MongoDB yet, auto-provision with derived credentials
    if (!dbUser) {
      const newUser = await User.create({
        clerkId: clerkUser.id,
        name: fullName,
        email: primaryEmail.toLowerCase().trim(),
        role: derivedRole,
        department: dynamicDepartment,
        rollNumber: dynamicRoll,
        profilePicture: clerkUser.imageUrl || "",
      });

      dbUser = newUser.toObject();
    } else {
      // If user had outdated fallback department or missing roll number, update with real values
      let needsUpdate = false;
      const updatePayload: Record<string, unknown> = {};

      if (!dbUser.rollNumber) {
        updatePayload.rollNumber = dynamicRoll;
        needsUpdate = true;
      }
      if (metaDept && dbUser.department !== metaDept) {
        updatePayload.department = metaDept;
        needsUpdate = true;
      }
      if (dbUser.role !== derivedRole && derivedRole !== "Student") {
        updatePayload.role = derivedRole;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await User.updateOne({ _id: dbUser._id }, { $set: updatePayload });
        dbUser = { ...dbUser, ...updatePayload } as IUser;
      }
    }

    if (!dbUser) return null;

    return {
      _id: dbUser._id.toString(),
      clerkId: dbUser.clerkId,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || "",
      role: dbUser.role,
      department: dbUser.department || dynamicDepartment,
      rollNumber: dbUser.rollNumber || dynamicRoll,
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
 * Update the user's role or department in MongoDB
 */
export async function updateUserRole(
  clerkId: string,
  newRole: UserRole,
  department?: string
): Promise<SerializedUser | null> {
  try {
    await connectToDatabase();

    const updateFields: Record<string, unknown> = { role: newRole };
    if (department) updateFields.department = department;

    const updatedUser = await User.findOneAndUpdate(
      { clerkId },
      updateFields,
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
      department: updatedUser.department,
      rollNumber: updatedUser.rollNumber || "",
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
      department: user.department,
      rollNumber: user.rollNumber || "",
      profilePicture: user.profilePicture || "",
    };
  } catch (error) {
    console.error("[UserAction: getUserByClerkId] Error:", error);
    return null;
  }
}
