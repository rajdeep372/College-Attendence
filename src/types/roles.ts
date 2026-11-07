export type UserRole = "principal" | "hod" | "teacher" | "student";

export interface RoleConfig {
  id: UserRole;
  title: string;
  badge: string;
  description: string;
  color: string;
  glowColor: string;
  route: string;
}

export const ROLES: Record<UserRole, RoleConfig> = {
  principal: {
    id: "principal",
    title: "Principal / Director",
    badge: "Executive Head",
    description: "College-wide institutional oversight, faculty auditing, policy governance, and campus-wide compliance analytics.",
    color: "from-purple-500 to-indigo-600",
    glowColor: "rgba(168, 85, 247, 0.35)",
    route: "/dashboard/principal",
  },
  hod: {
    id: "hod",
    title: "Head of Department (HOD)",
    badge: "Department Lead",
    description: "Branch administration, faculty schedule monitoring, student leave sanctions, and syllabus pace tracking.",
    color: "from-blue-600 to-cyan-500",
    glowColor: "rgba(59, 130, 246, 0.35)",
    route: "/dashboard/hod",
  },
  teacher: {
    id: "teacher",
    title: "Faculty / Professor",
    badge: "Academic Instructor",
    description: "Lecture attendance conduction (QR/Biometric), automated defaulter flags, internal marks, and student alerts.",
    color: "from-emerald-500 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.35)",
    route: "/dashboard/teacher",
  },
  student: {
    id: "student",
    title: "Student Portal",
    badge: "Undergraduate / Scholar",
    description: "Live attendance percentage tracker, 75% threshold safety alerts, timetable, and leave requests.",
    color: "from-sky-500 to-blue-600",
    glowColor: "rgba(14, 165, 233, 0.35)",
    route: "/dashboard/student",
  },
};

