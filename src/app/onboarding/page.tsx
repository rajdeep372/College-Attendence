import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { determineUserRole, resolveInstitutionalRole } from "@/lib/server-rbac";
import { 
  deriveDepartment,
  deriveRollNumber,
  getRoleDashboardPath, 
  isPrincipalSuperAdmin,
  isPersonalEmail,
} from "@/lib/auth-rbac";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";

export default async function OnboardingPage() {
  const clerkUser = await currentUser();

  // If not logged in at all, redirect to home login gate
  if (!clerkUser) {
    redirect("/");
  }

  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";

  // Check if user has already completed onboarding
  const dbUser = await getCurrentUser();
  if (dbUser && dbUser.onboarded) {
    const targetDashboard = getRoleDashboardPath(dbUser.role);
    redirect(targetDashboard);
  }

  // Strictly determine role from backend whitelist
  const roleInfo = await resolveInstitutionalRole(primaryEmail);
  const serverAssignedRole = roleInfo.role;

  const isPrincipal = serverAssignedRole.includes("Principal");
  const isStudent = serverAssignedRole === "Student";

  const fullName = roleInfo.name || dbUser?.name || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "";
  const derivedDepartment = roleInfo.department || dbUser?.department || (isPrincipal ? "Office of the Principal & Institutional Affairs" : "Computer Science & Engineering (CSE)");
  const derivedRoll = isStudent ? (dbUser?.rollNumber || deriveRollNumber(primaryEmail, serverAssignedRole)) : (isPrincipal ? "ADM-PRIN" : "");

  return (
    <div className="min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950/80 dark:text-slate-100 transition-colors">
      {/* Official Top Bar */}
      <header className="w-full border-b border-slate-200 dark:border-sky-500/20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Academia<span className="text-sky-600 dark:text-sky-400">Sync</span>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-sky-600 dark:text-sky-400 uppercase">
                Official Institutional Verification
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InstallPwaPrompt />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <OnboardingForm
          initialEmail={primaryEmail}
          initialName={fullName}
          initialRole={serverAssignedRole}
          initialDisplayRole={roleInfo.displayRole}
          initialDepartment={derivedDepartment}
          initialRoll={derivedRoll}
          initialIsLocked={roleInfo.isWhitelisted && !isStudent}
        />
      </main>

      <footer className="w-full py-4 text-center text-[10px] text-slate-500 border-t border-slate-200 dark:border-white/5">
        AcademiaSync Institutional Portal &bull; Cryptographic RBAC & Smart Timetable Sync
      </footer>
    </div>
  );
}
