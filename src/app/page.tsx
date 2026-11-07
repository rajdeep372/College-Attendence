import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { 
  GraduationCap, 
  AlertTriangle
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail, 
  getRoleDashboardPath 
} from "@/lib/auth-rbac";
import { InstitutionalSignInCard } from "@/components/auth/InstitutionalSignInCard";

export default async function HomePage() {
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch {
    // In static rendering or unauthenticated session
  }

  // If already logged in, validate institutional email & auto-route immediately
  if (clerkUser) {
    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const validation = validateInstitutionalEmail(primaryEmail);

    if (!validation.valid) {
      // Personal email detected: show strict access denial screen
      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 text-slate-100">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-card border-2 border-rose-500/40 text-center shadow-[0_20px_50px_rgba(244,63,94,0.25)] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-5 border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
              Institutional Security Policy Violation
            </span>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Personal Email Restricted
            </h1>

            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {validation.error || "Personal email addresses (@gmail.com, @yahoo.com, etc.) are strictly prohibited from accessing this institutional ledger."}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 text-left text-xs space-y-1">
              <div className="text-slate-400">Authenticated Account:</div>
              <div className="font-mono text-rose-300 font-bold truncate">{primaryEmail}</div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignOutButton redirectUrl="/">
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer">
                  Sign Out & Use College Email
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      );
    }

    // Email is valid institutional account -> derive role and auto-redirect
    const assignedRole = deriveRoleFromEmail(primaryEmail);
    const targetDashboard = getRoleDashboardPath(assignedRole);
    redirect(targetDashboard);
  }

  // Not logged in: Show clean, professional official college login inside the center card
  return (
    <div className="min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-hidden relative">
      {/* Official Header Bar */}
      <header className="w-full border-b border-sky-500/20 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                Academia<span className="text-sky-400">Sync</span>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-sky-400 -mt-0.5 uppercase">
                Official Institutional Portal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InstallPwaPrompt />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Login Workspace with Center 3D Glassmorphic SignIn Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <InstitutionalSignInCard />
      </main>

      {/* Institutional Legal Footer */}
      <footer className="w-full py-4 text-center border-t border-white/5 bg-slate-950/50 backdrop-blur-md">
        <p className="text-[11px] text-slate-500">
          AcademiaSync Institutional Attendance & Management System &bull; Secure Encrypted Session
        </p>
      </footer>
    </div>
  );
}
