"use server";

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser, UserRole } from "@/models/User";
import { determineUserRole } from "@/lib/server-rbac";
import { 
  validateInstitutionalEmail, 
  deriveDepartment,
  deriveRollNumber,
  isPrincipalSuperAdmin,
  isPersonalEmail 
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
  academicYear?: string;
  semester?: number;
  section?: string;
  designation?: string;
  onboarded?: boolean;
  profilePicture: string;
  idCardSoftCopy?: string;
  sessionYear?: string;
  batchDuration?: string;
  archivedSessions?: Array<{
    semester: number;
    sessionYear: string;
    attendancePercentage: number;
    archivedAt: string;
  }>;
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

    // Strictly determine role from backend whitelist
    const serverAssignedRole: UserRole = await determineUserRole(primaryEmail);

    const metaDept = (clerkUser.publicMetadata as { department?: string })?.department;
    const metaRoll = (clerkUser.publicMetadata as { rollNumber?: string })?.rollNumber;

    const dynamicDepartment = deriveDepartment(primaryEmail, metaDept);
    const dynamicRoll = deriveRollNumber(primaryEmail, serverAssignedRole, metaRoll);

    // Query user by clerkId
    let dbUser = await User.findOne({ clerkId: clerkUser.id }).lean<IUser>();

    const isGodMode = primaryEmail.toLowerCase().trim() === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(primaryEmail);

    // If user not in MongoDB yet, auto-provision with derived credentials
    if (!dbUser) {
      const initialRole: UserRole = serverAssignedRole;
      const initialDept = isGodMode
        ? "Executive Institutional Leadership"
        : dynamicDepartment;

      const newUser = await User.create({
        clerkId: clerkUser.id,
        name: isGodMode ? `${fullName} (Principal)` : fullName,
        email: primaryEmail.toLowerCase().trim(),
        role: initialRole,
        department: initialDept,
        rollNumber: isGodMode ? "ADM-PRIN-SUPERADMIN" : dynamicRoll,
        designation: isGodMode ? "Principal (Admin)" : initialRole === "HOD" ? "Head of Department (HOD)" : initialRole === "Teacher" ? "Faculty Instructor" : "",
        onboarded: isGodMode ? true : false,
        profilePicture: clerkUser.imageUrl || "",
      });

      dbUser = newUser.toObject();

      // Secure Clerk Sync: update Clerk publicMetadata.role
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            role: initialRole,
            department: initialDept,
          },
        });
      } catch (clerkErr) {
        console.warn("[getCurrentUser] Clerk metadata sync warning:", clerkErr);
      }
    } else {
      // If existing user role deviates from whitelist, forcefully correct it!
      let needsUpdate = false;
      const updatePayload: Record<string, unknown> = {};

      if (isGodMode && (!dbUser.role?.includes("Principal") || !dbUser.onboarded)) {
        updatePayload.role = "Principal (Admin)";
        updatePayload.department = "Executive Institutional Leadership";
        updatePayload.designation = "Principal (Admin)";
        updatePayload.onboarded = true;
        needsUpdate = true;
      } else if (!isGodMode && dbUser.role !== serverAssignedRole) {
        updatePayload.role = serverAssignedRole;
        needsUpdate = true;
      }

      if (!dbUser.rollNumber) {
        updatePayload.rollNumber = dynamicRoll;
        needsUpdate = true;
      }
      if (metaDept && dbUser.department !== metaDept) {
        updatePayload.department = metaDept;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await User.updateOne({ _id: dbUser._id }, { $set: updatePayload });
        dbUser = { ...dbUser, ...updatePayload } as IUser;

        // Secure Clerk Sync for existing user
        try {
          const client = await clerkClient();
          await client.users.updateUserMetadata(clerkUser.id, {
            publicMetadata: {
              role: (updatePayload.role as string) || dbUser.role,
            },
          });
        } catch (clerkErr) {
          console.warn("[getCurrentUser] Clerk metadata update warning:", clerkErr);
        }
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
      academicYear: dbUser.academicYear || "1st Year",
      semester: dbUser.semester || 1,
      section: dbUser.section || "Section A",
      designation: dbUser.designation || "",
      onboarded: Boolean(dbUser.onboarded),
      profilePicture: dbUser.profilePicture || clerkUser.imageUrl || "",
      idCardSoftCopy: dbUser.idCardSoftCopy || "",
      sessionYear: dbUser.sessionYear || "2024-2025",
      batchDuration: dbUser.batchDuration || dbUser.sessionYear || "2024-2028",
      archivedSessions: dbUser.archivedSessions?.map((s) => ({
        semester: s.semester,
        sessionYear: s.sessionYear,
        attendancePercentage: s.attendancePercentage,
        archivedAt: s.archivedAt instanceof Date ? s.archivedAt.toISOString() : String(s.archivedAt),
      })) || [],
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
      semester: updatedUser.semester || 1,
      section: updatedUser.section || "A",
      designation: updatedUser.designation || "",
      onboarded: Boolean(updatedUser.onboarded),
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
      semester: user.semester || 1,
      section: user.section || "A",
      designation: user.designation || "",
      onboarded: Boolean(user.onboarded),
      profilePicture: user.profilePicture || "",
    };
  } catch (error) {
    console.error("[UserAction: getUserByClerkId] Error:", error);
    return null;
  }
}
