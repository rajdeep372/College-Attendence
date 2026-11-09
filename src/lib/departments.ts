/**
 * Canonical Academic Department Definitions & Normalization
 * Standardizes department strings across authorizedstaffs, users, timetables, and roster views.
 */

export const STANDARD_DEPARTMENTS = [
  "Bachelor of Computer Applications (BCA)",
  "Master of Computer Applications (MCA)",
  "Computer Science & Engineering (CSE)",
  "Information Technology (IT)",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Data Science & Analytics",
  "Cyber Security & Forensics",
  "Office of the Principal & Institutional Affairs",
  "General Academic & Sciences",
] as const;

export type StandardDepartment = (typeof STANDARD_DEPARTMENTS)[number];

/**
 * Standardizes any department string into its canonical institutional representation.
 * e.g., "BCA", "bca", "Bachelor of Computer Applications" -> "Bachelor of Computer Applications (BCA)"
 */
export function standardizeDepartment(dept?: string | null): string {
  if (!dept || typeof dept !== "string") {
    return "Bachelor of Computer Applications (BCA)";
  }

  const trimmed = dept.trim();
  if (!trimmed) {
    return "Bachelor of Computer Applications (BCA)";
  }

  // Exact match first
  const exact = STANDARD_DEPARTMENTS.find(
    (d) => d.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;

  const clean = trimmed.toLowerCase().replace(/[^a-z0-9]/g, " ");

  // BCA Check
  if (
    clean.includes("bca") ||
    (clean.includes("bachelor") && clean.includes("computer") && clean.includes("app"))
  ) {
    return "Bachelor of Computer Applications (BCA)";
  }

  // MCA Check
  if (
    clean.includes("mca") ||
    (clean.includes("master") && clean.includes("computer") && clean.includes("app"))
  ) {
    return "Master of Computer Applications (MCA)";
  }

  // CSE Check
  if (
    clean.includes("cse") ||
    (clean.includes("computer") && clean.includes("science"))
  ) {
    return "Computer Science & Engineering (CSE)";
  }

  // IT Check
  if (
    clean === "it" ||
    clean.startsWith("it ") ||
    clean.endsWith(" it") ||
    clean.includes("information tech")
  ) {
    return "Information Technology (IT)";
  }

  // AIML Check
  if (
    clean.includes("aiml") ||
    clean.includes("ai ml") ||
    (clean.includes("artificial") && clean.includes("intelligence"))
  ) {
    return "Artificial Intelligence & Machine Learning (AIML)";
  }

  // ECE Check
  if (
    clean.includes("ece") ||
    (clean.includes("electronics") && clean.includes("communication"))
  ) {
    return "Electronics & Communication Engineering (ECE)";
  }

  // EEE Check
  if (
    clean.includes("eee") ||
    (clean.includes("electrical") && clean.includes("electronics"))
  ) {
    return "Electrical & Electronics Engineering (EEE)";
  }

  // ME Check
  if (clean.includes("mechanical") || clean === "me") {
    return "Mechanical Engineering (ME)";
  }

  // CE Check
  if (clean.includes("civil") || clean === "ce") {
    return "Civil Engineering (CE)";
  }

  // Data Science Check
  if (clean.includes("data science")) {
    return "Data Science & Analytics";
  }

  // Cyber Security Check
  if (clean.includes("cyber")) {
    return "Cyber Security & Forensics";
  }

  // Principal / Leadership Check
  if (
    clean.includes("principal") ||
    clean.includes("dean") ||
    clean.includes("institutional affairs") ||
    clean.includes("executive")
  ) {
    return "Office of the Principal & Institutional Affairs";
  }

  // General Sciences Check
  if (clean.includes("general") || clean.includes("basic science")) {
    return "General Academic & Sciences";
  }

  return trimmed;
}

/**
 * Returns all common variations/acronyms for a department name to ensure
 * backward-compatible MongoDB queries.
 */
export function getDepartmentVariants(dept?: string | null): string[] {
  if (!dept) return [];
  const canonical = standardizeDepartment(dept);

  const variantMap: Record<string, string[]> = {
    "Bachelor of Computer Applications (BCA)": [
      "Bachelor of Computer Applications (BCA)",
      "Bachelor of Computer Applications",
      "BCA",
      "bca",
      "B.C.A.",
      "B.C.A",
    ],
    "Master of Computer Applications (MCA)": [
      "Master of Computer Applications (MCA)",
      "Master of Computer Applications",
      "MCA",
      "mca",
      "M.C.A.",
      "M.C.A",
    ],
    "Computer Science & Engineering (CSE)": [
      "Computer Science & Engineering (CSE)",
      "Computer Science & Engineering",
      "Computer Science and Engineering",
      "CSE",
      "cse",
      "C.S.E.",
    ],
    "Information Technology (IT)": [
      "Information Technology (IT)",
      "Information Technology",
      "IT",
      "it",
      "I.T.",
    ],
    "Artificial Intelligence & Machine Learning (AIML)": [
      "Artificial Intelligence & Machine Learning (AIML)",
      "Artificial Intelligence & Machine Learning",
      "AIML",
      "aiml",
      "AI & ML",
      "AI/ML",
    ],
    "Electronics & Communication Engineering (ECE)": [
      "Electronics & Communication Engineering (ECE)",
      "Electronics & Communication Engineering",
      "Electronics and Communication Engineering",
      "ECE",
      "ece",
    ],
    "Electrical & Electronics Engineering (EEE)": [
      "Electrical & Electronics Engineering (EEE)",
      "Electrical & Electronics Engineering",
      "Electrical and Electronics Engineering",
      "EEE",
      "eee",
    ],
    "Mechanical Engineering (ME)": [
      "Mechanical Engineering (ME)",
      "Mechanical Engineering",
      "ME",
      "me",
    ],
    "Civil Engineering (CE)": [
      "Civil Engineering (CE)",
      "Civil Engineering",
      "CE",
      "ce",
    ],
    "Data Science & Analytics": [
      "Data Science & Analytics",
      "Data Science",
      "DS",
    ],
    "Cyber Security & Forensics": [
      "Cyber Security & Forensics",
      "Cyber Security",
    ],
    "Office of the Principal & Institutional Affairs": [
      "Office of the Principal & Institutional Affairs",
      "Executive Institutional Leadership",
      "Office of the Principal",
      "Principal",
    ],
    "General Academic & Sciences": [
      "General Academic & Sciences",
      "General Academic & Science",
      "General",
    ],
  };

  const list = variantMap[canonical] || [canonical];
  if (!list.includes(dept.trim())) {
    list.push(dept.trim());
  }
  return Array.from(new Set(list));
}

/**
 * Checks whether two department strings represent the same department.
 */
export function isSameDepartment(deptA?: string | null, deptB?: string | null): boolean {
  if (!deptA || !deptB) return false;
  return standardizeDepartment(deptA) === standardizeDepartment(deptB);
}
