import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail, 
  deriveDepartment,
  deriveRollNumber,
  getRoleDashboardPath,
  isPrincipalSuperAdmin,
  isPersonalEmail,
  STRICT_SSO_ERROR_MESSAGE 
} from "@/lib/auth-rbac";
import { AlertTriangle, GraduationCap, Lock } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";

export default async function OnboardingPage() {
  const clerkUser = await currentUser();

  // If not logged in at all, redirect to home login gate
  if (!clerkUser) {
    redirect("/");
  }

  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const isPersonal = isPersonalEmail(primaryEmail);
  const isSuperAdmin = isPrincipalSuperAdmin(primaryEmail);

  // Check if user has already completed onboarding
  const dbUser = await getCurrentUser();
  if (dbUser && dbUser.onboarded) {
    // If user has personal email but was onboarded as Student/Teacher, block with strict SSO error
    if (isPersonal && dbUser.role !== "Principal" && !isSuperAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-card border-2 border-rose-500/40 text-center shadow-[0_20px_50px_rgba(244,63,94,0.25)] relative overflow-hidden">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-5 border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
              Institutional Policy Violation
            </span>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Strict SSO Domain Policy Violation
            </h1>

            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
              {STRICT_SSO_ERROR_MESSAGE}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 text-left text-xs space-y-1">
              <div className="text-slate-400">Authenticated Account:</div>
              <div className="font-mono text-rose-300 font-bold truncate">{primaryEmail}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Personal emails (@{primaryEmail.split("@")[1]}) are strictly prohibited for students and teachers.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center">
              <SignOutButton redirectUrl="/">
                <button className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer">
                  Sign Out & Use College Email
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      );
    }

    const targetDashboard = getRoleDashboardPath(dbUser.role);
    redirect(targetDashboard);
  }

  // Derive initial values for onboarding form
  const derivedRole = isSuperAdmin
    ? "Principal"
    : isPersonal
    ? "Principal"
    : deriveRoleFromEmail(primaryEmail);

  const derivedDepartment =
    dbUser?.department || (derivedRole === "Principal" ? "Office of the Principal & Institutional Affairs" : deriveDepartment(primaryEmail));
  const derivedRoll = dbUser?.rollNumber || deriveRollNumber(primaryEmail, derivedRole);
  const fullName = dbUser?.name || `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "";

  return (
    <div className="min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-hidden bg-slate-950/80">
      {/* Official Top Bar */}
      <header className="w-full border-b border-sky-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                Academia<span className="text-sky-400">Sync</span>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-sky-400 uppercase">
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
          initialRole={derivedRole}
          initialDepartment={derivedDepartment}
          initialRoll={derivedRoll}
        />
      </main>

      <footer className="w-full py-4 text-center text-[10px] text-slate-500 border-t border-white/5">
        AcademiaSync Institutional Portal &bull; Cryptographic RBAC & Smart Timetable Sync
      </footer>
    </div>
  );
}

