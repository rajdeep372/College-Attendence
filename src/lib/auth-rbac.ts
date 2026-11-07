export type InstitutionalRole = "Principal" | "HOD" | "Teacher" | "Student";

export const DISALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "yandex.com",
];

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  domain?: string;
  prefix?: string;
  role?: InstitutionalRole;
}

/**
 * Validates whether an email belongs to an official educational institution.
 * Strictly rejects consumer/personal emails (like @gmail.com, @yahoo.com).
 */
export function validateInstitutionalEmail(email?: string | null): EmailValidationResult {
  if (!email || !email.includes("@")) {
    return {
      valid: false,
      error: "Please enter a valid official college email address.",
    };
  }

  const cleanEmail = email.toLowerCase().trim();
  const parts = cleanEmail.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid email format." };
  }

  const [prefix, domain] = parts;
  if (!prefix || !domain) {
    return { valid: false, error: "Incomplete email address." };
  }

  // Reject personal / commercial email providers
  if (DISALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return {
      valid: false,
      domain,
      prefix,
      error: `Personal email accounts (@${domain}) are strictly prohibited. You must sign in using your official college credentials (e.g., rollnumber@college.edu or faculty@college.edu).`,
    };
  }

  const role = deriveRoleFromEmail(cleanEmail);
  return { valid: true, domain, prefix, role };
}

/**
 * Smart Auto-Assignment (Zero Onboarding):
 * - If prefix contains numbers/digits (e.g. 2023cs001, 22cs102, student24, 21bcs09) -> Assign "Student"
 * - If prefix matches executive leadership keywords (principal, director, dean) -> Assign "Principal"
 * - If prefix matches department head keywords (hod, head) -> Assign "HOD"
 * - If prefix contains letters/names without roll-number digits (e.g. arvind.sharma, faculty, prof.roy) -> Assign "Teacher"
 */
export function deriveRoleFromEmail(email: string): InstitutionalRole {
  const cleanEmail = email.toLowerCase().trim();
  const prefix = cleanEmail.split("@")[0] || "";

  // 1. Executive Leadership keywords
  if (
    prefix.includes("principal") ||
    prefix.includes("director") ||
    prefix.includes("dean")
  ) {
    return "Principal";
  }

  // 2. Department Head keywords
  if (
    prefix.includes("hod") ||
    prefix.startsWith("head.") ||
    prefix.endsWith(".head") ||
    prefix === "head"
  ) {
    return "HOD";
  }

  // 3. Roll Number / Student digits pattern
  // Student emails typically embed admission year or serial number: e.g. 2023cs001, cs22091, 101student
  const hasDigits = /\d/.test(prefix);
  if (hasDigits) {
    return "Student";
  }

  // 4. Default faculty / teachers (alphabetical prefixes like first.last, prof.name)
  return "Teacher";
}

/**
 * Map institutional role to exact dashboard route
 */
export function getRoleDashboardPath(role: InstitutionalRole | string): string {
  const normalized = (role || "").toLowerCase();
  switch (normalized) {
    case "principal":
      return "/dashboard/principal";
    case "hod":
      return "/dashboard/hod";
    case "teacher":
      return "/dashboard/teacher";
    case "student":
    default:
      return "/dashboard/student";
  }
}
