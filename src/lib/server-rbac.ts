import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AuthorizedStaff from "@/models/AuthorizedStaff";
import { UserRole } from "@/models/User";
import { isPrincipalSuperAdmin } from "@/lib/auth-rbac";

export interface ResolvedRoleInfo {
  role: UserRole;
  displayRole: string;
  rawRole: string;
  isWhitelisted: boolean;
}

/**
 * Normalizes any database role string into the official institutional UserRole
 * Handles "Faculty / Teacher", "Faculty", "Teacher", "HOD", "Head of Department", "Principal", etc.
 */
export function normalizeStaffRole(rawRole?: string | null): { role: UserRole; displayRole: string } {
  if (!rawRole) return { role: "Student", displayRole: "Student" };
  const clean = rawRole.trim().toLowerCase();

  if (clean.includes("principal") || clean.includes("admin")) {
    return { role: "Principal (Admin)", displayRole: "Principal (Admin)" };
  }
  if (clean.includes("hod") || clean.includes("head")) {
    return { role: "Head of Dept (HOD)", displayRole: "Head of Dept (HOD)" };
  }
  if (
    clean.includes("teacher") ||
    clean.includes("faculty") ||
    clean.includes("professor") ||
    clean.includes("lecturer") ||
    clean.includes("instructor")
  ) {
    return { role: "Faculty / Teacher", displayRole: "Faculty / Teacher" };
  }
  return { role: "Student", displayRole: "Student" };
}

/**
 * Strict Zero-Trust Backend Role Resolver
 * 1. Principal Hardcode: strictly checks if email matches chatterjeer477@gmail.com
 * 2. AuthorizedStaff Whitelist: queries MongoDB authorizedstaffs collection with case-insensitivity
 * 3. Default Student Fallback: permanently falls back to 'Student'
 */
export async function resolveInstitutionalRole(email?: string | null): Promise<ResolvedRoleInfo> {
  if (!email) {
    return {
      role: "Student",
      displayRole: "Student",
      rawRole: "Student",
      isWhitelisted: false,
    };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Principal Hardcode
  if (normalizedEmail === "chatterjeer477@gmail.com" || isPrincipalSuperAdmin(normalizedEmail)) {
    return {
      role: "Principal (Admin)",
      displayRole: "Principal (Admin)",
      rawRole: "Principal (Admin)",
      isWhitelisted: true,
    };
  }

  try {
    await connectToDatabase();

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexQuery = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");

    // 2. Query AuthorizedStaff collection with case-insensitivity on both sides
    let staffDoc: { email?: string; role?: string; name?: string; department?: string } | null = null;

    const mongooseStaff = await AuthorizedStaff.findOne({
      $or: [{ email: normalizedEmail }, { email: regexQuery }],
    }).lean();

    if (mongooseStaff) {
      staffDoc = mongooseStaff as any;
    } else if (mongoose.connection?.db) {
      // Direct raw collection fallback if Mongoose model missed schema mapping
      staffDoc = (await mongoose.connection.db.collection("authorizedstaffs").findOne({
        $or: [{ email: normalizedEmail }, { email: regexQuery }],
      })) as any;
    }

    if (staffDoc && staffDoc.role) {
      const normalized = normalizeStaffRole(staffDoc.role);
      console.log(
        `[Zero-Trust RBAC] Matched whitelist for '${normalizedEmail}' -> DB Role: '${staffDoc.role}', Resolved Role: '${normalized.role}'`
      );
      return {
        role: normalized.role,
        displayRole: staffDoc.role.trim() || normalized.displayRole,
        rawRole: staffDoc.role,
        isWhitelisted: true,
      };
    }
  } catch (err) {
    console.error("[resolveInstitutionalRole] Error querying authorizedstaffs collection:", err);
  }

  // 3. Default Student Fallback
  console.log(`[Zero-Trust RBAC] '${normalizedEmail}' not in whitelist -> Fallback strictly to 'Student'`);
  return {
    role: "Student",
    displayRole: "Student",
    rawRole: "Student",
    isWhitelisted: false,
  };
}

/**
 * Returns strictly the UserRole enum ("Principal" | "HOD" | "Teacher" | "Student")
 */
export async function determineUserRole(email?: string | null): Promise<UserRole> {
  const result = await resolveInstitutionalRole(email);
  return result.role;
}

/**
 * Checks if an email is present in the AuthorizedStaff whitelist
 */
export async function isWhitelistedStaff(email?: string | null): Promise<boolean> {
  const result = await resolveInstitutionalRole(email);
  return result.isWhitelisted;
}
