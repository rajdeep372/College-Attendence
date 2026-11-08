import { connectToDatabase } from "@/lib/mongodb";
import AuthorizedStaff from "@/models/AuthorizedStaff";
import { UserRole } from "@/models/User";
import { isPrincipalSuperAdmin } from "@/lib/auth-rbac";

/**
 * Strict Zero-Trust Backend Role Resolver
 * 1. Principal Hardcode: strictly checks if email matches chatterjeer477@gmail.com
 * 2. AuthorizedStaff Whitelist: queries MongoDB AuthorizedStaff collection
 * 3. Default Student Fallback: permanently falls back to 'Student'
 */
export async function determineUserRole(email?: string | null): Promise<UserRole> {
  if (!email) return "Student";
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Principal Hardcode
  if (normalizedEmail === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(normalizedEmail)) {
    return "Principal";
  }

  try {
    await connectToDatabase();
    // 2. AuthorizedStaff Whitelist
    const staff = await AuthorizedStaff.findOne({ email: normalizedEmail }).lean();
    if (staff && staff.role && ["Teacher", "HOD", "Principal"].includes(staff.role)) {
      return staff.role as UserRole;
    }
  } catch (err) {
    console.error("[determineUserRole] Error querying AuthorizedStaff whitelist:", err);
  }

  // 3. Default Student Fallback
  return "Student";
}

/**
 * Checks if an email is present in the AuthorizedStaff whitelist
 */
export async function isWhitelistedStaff(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await connectToDatabase();
    const staff = await AuthorizedStaff.findOne({ email: normalizedEmail }).lean();
    return Boolean(staff);
  } catch {
    return false;
  }
}

