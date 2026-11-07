export type InstitutionalRole = "Principal" | "HOD" | "Teacher" | "Student";

/**
 * Hardcoded Supreme Principal God-Mode Super-Admin email
 */
export const PRINCIPAL_SUPERADMIN_EMAIL = "chatterjeer477@gmail.com";

/**
 * Institutional SSO Error Message required across all interfaces
 */
export const STRICT_SSO_ERROR_MESSAGE =
  "Strict SSO: Please use your official college email ID provided by the institution.";

export function isPrincipalSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  const envSuperAdmin = (process.env.PRINCIPAL_SUPERADMIN_EMAIL || "").toLowerCase().trim();
  const envAdminEmails = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    clean === PRINCIPAL_SUPERADMIN_EMAIL ||
    (Boolean(envSuperAdmin) && clean === envSuperAdmin) ||
    envAdminEmails.includes(clean)
  );
}

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

/**
 * Checks if an email address belongs to a standard commercial/personal provider
 */
export function isPersonalEmail(email?: string | null): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.toLowerCase().trim().split("@")[1];
  if (!domain) return false;
  return DISALLOWED_EMAIL_DOMAINS.includes(domain);
}

export const DEPARTMENT_DICTIONARY: Record<string, string> = {
  cse: "Computer Science & Engineering",
  cs: "Computer Science & Engineering",
  comp: "Computer Science & Engineering",
  it: "Information Technology",
  infotech: "Information Technology",
  ece: "Electronics & Communication Engineering",
  ec: "Electronics & Communication Engineering",
  etce: "Electronics & Telecommunication Engineering",
  ee: "Electrical & Electronics Engineering",
  eee: "Electrical & Electronics Engineering",
  me: "Mechanical Engineering",
  mech: "Mechanical Engineering",
  mechanical: "Mechanical Engineering",
  ce: "Civil Engineering",
  civil: "Civil Engineering",
  aiml: "Artificial Intelligence & Machine Learning",
  ai: "Artificial Intelligence & Machine Learning",
  ds: "Data Science & Analytics",
  aids: "AI & Data Science",
  bba: "Management Studies",
  mba: "Business Administration",
  mgmt: "Management Studies",
  phy: "Physics & Applied Sciences",
  chem: "Chemistry & Materials Science",
  math: "Mathematics & Computing",
  admin: "College Administration",
};

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  domain?: string;
  prefix?: string;
  role?: InstitutionalRole;
  department?: string;
  rollNumber?: string;
}

/**
 * Dynamically derives department from email prefix, domain, or metadata.
 * Never defaults blindly to 'Computer Science'.
 */
export function deriveDepartment(
  email: string,
  metadataDept?: string | null
): string {
  // 1. If explicitly set in Clerk public metadata, respect it
  if (metadataDept && metadataDept.trim()) {
    return metadataDept.trim();
  }

  const clean = (email || "").toLowerCase().trim();
  const prefix = clean.split("@")[0] || "";

  // Split prefix by common delimiters (dots, underscores, hyphens, numbers)
  const tokens = prefix.split(/[._\-\d]+/);

  for (const token of tokens) {
    if (token && DEPARTMENT_DICTIONARY[token]) {
      return DEPARTMENT_DICTIONARY[token];
    }
  }

  // Check substring matches
  for (const [key, deptName] of Object.entries(DEPARTMENT_DICTIONARY)) {
    // Only match if token is bounded or distinct
    const regex = new RegExp(`(^|[._\\-\\d])${key}([._\\-\\d]|$)`, "i");
    if (regex.test(prefix)) {
      return deptName;
    }
  }

  // If email belongs to executive office
  if (prefix.includes("principal") || prefix.includes("dean") || prefix.includes("director")) {
    return "Office of the Principal & Institutional Affairs";
  }

  return "General Academic & Sciences";
}

/**
 * Dynamically derives student roll number or faculty ID from email and metadata
 */
export function deriveRollNumber(
  email: string,
  role: InstitutionalRole,
  metadataRoll?: string | null
): string {
  if (metadataRoll && metadataRoll.trim()) {
    return metadataRoll.trim().toUpperCase();
  }

  const clean = (email || "").toLowerCase().trim();
  const prefix = clean.split("@")[0] || "";

  if (role === "Student") {
    // Detect year + department + serial patterns, e.g., 2023cs001, 22.cse.042, 21bcs09
    const match = prefix.match(/(\d{2,4})[._\-]?([a-z]{2,4})[._\-]?(\d{1,4})/i);
    if (match) {
      const year = match[1].length === 2 ? `20${match[1]}` : match[1];
      const dept = match[2].toUpperCase();
      const num = match[3].padStart(3, "0");
      return `${year}-${dept}-${num}`;
    }

    const simpleDigits = prefix.match(/\d+/g);
    if (simpleDigits && simpleDigits.length > 0) {
      const numStr = simpleDigits.join("");
      return `STU-${numStr.slice(0, 8)}`;
    }

    return `STU-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (role === "Teacher") {
    return `FAC-${prefix.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  if (role === "HOD") {
    return `HOD-${prefix.slice(0, 4).toUpperCase()}`;
  }

  return `ADM-PRIN-${new Date().getFullYear()}`;
}

/**
 * Validates whether an email belongs to an official educational institution.
 * - Supreme Principal God-Mode email is always authorized as Principal.
 * - Standard personal emails (@gmail.com, @yahoo.com, etc.) are allowed ONLY if claiming or operating under the 'Principal' role (for admin testing/management).
 * - Students, Teachers, and HODs MUST use an official institutional email; personal emails are strictly rejected with:
 *   'Strict SSO: Please use your official college email ID provided by the institution.'
 */
export function validateInstitutionalEmail(
  email?: string | null,
  requestedRole?: InstitutionalRole | string | null
): EmailValidationResult {
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

  // 1. Supreme Principal God-Mode Super-Admin exception
  if (isPrincipalSuperAdmin(cleanEmail)) {
    return {
      valid: true,
      domain: domain || "academiasync.edu",
      prefix: prefix || "principal",
      role: "Principal",
      department: "Executive Institutional Leadership",
      rollNumber: "ADM-PRIN-SUPERADMIN",
    };
  }

  const isPersonal = DISALLOWED_EMAIL_DOMAINS.includes(domain);
  const normalizedRole = requestedRole
    ? (requestedRole.trim() as InstitutionalRole)
    : undefined;

  // 2. Personal Email Handling:
  // Standard personal emails (@gmail.com, etc.) allowed ONLY if claiming the 'Principal' role
  if (isPersonal) {
    if (normalizedRole === "Principal") {
      return {
        valid: true,
        domain,
        prefix,
        role: "Principal",
        department: "Office of the Principal & Institutional Affairs",
        rollNumber: `ADM-PRIN-${new Date().getFullYear()}`,
      };
    }

    // Teachers, HODs, and Students are strictly blocked with the exact error message
    return {
      valid: false,
      domain,
      prefix,
      role: normalizedRole,
      error: STRICT_SSO_ERROR_MESSAGE,
    };
  }

  // 3. Official college/institutional domain:
  const role = normalizedRole || deriveRoleFromEmail(cleanEmail);
  const department = deriveDepartment(cleanEmail);
  const rollNumber = deriveRollNumber(cleanEmail, role);

  return { valid: true, domain, prefix, role, department, rollNumber };
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

  // Supreme Principal God-Mode Super-Admin
  if (isPrincipalSuperAdmin(cleanEmail)) {
    return "Principal";
  }

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
  const hasDigits = /\d/.test(prefix);
  if (hasDigits) {
    return "Student";
  }

  // 4. Default faculty / teachers
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
