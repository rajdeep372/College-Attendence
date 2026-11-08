import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getRoleDashboardPath } from "@/lib/auth-rbac";

export default async function HomePage() {
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch {
    // In static rendering or unauthenticated
  }

  // Strictly route authenticated users away from public pages to their dashboard
  if (clerkUser) {
    const dbUser = await getCurrentUser();
    if (dbUser && dbUser.onboarded) {
      redirect(getRoleDashboardPath(dbUser.role));
    }
    redirect("/dashboard");
  }

  // Unauthenticated user: Standard Clerk Sign-In with instant loading skeleton
  return (
    <div className="min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-hidden relative bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Official Header Bar */}
      <header className="w-full border-b border-slate-200 dark:border-sky-500/20 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Academia<span className="text-sky-600 dark:text-sky-400">Sync</span>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-sky-600 dark:text-sky-400 -mt-0.5 uppercase">
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

      {/* Main Login Workspace - Standard Clerk Components with Instant Hydration */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <ClerkLoading>
            <div className="w-full h-96 rounded-3xl glass-card border border-slate-200 dark:border-sky-400/20 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900/60 shadow-xl dark:shadow-[0_15px_45px_rgba(2,132,199,0.15)] animate-pulse">
              <div className="w-10 h-10 border-4 border-sky-400/30 border-t-sky-500 rounded-full animate-spin" />
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                Loading Institutional Sign-In...
              </div>
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <SignIn
              routing="hash"
              fallbackRedirectUrl="/dashboard"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-full",
                  card: "w-full max-w-full rounded-3xl glass-card border border-slate-200 dark:border-sky-400/30 shadow-xl dark:shadow-[0_15px_45px_rgba(2,132,199,0.2)] bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white",
                  headerTitle: "text-slate-900 dark:text-white text-lg font-bold",
                  headerSubtitle: "text-slate-600 dark:text-slate-300 text-xs",
                  formButtonPrimary:
                    "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] text-xs py-2.5 rounded-xl transition-all",
                  formFieldInput:
                    "bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-sky-500/30 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 dark:focus:border-sky-400 rounded-xl text-sm",
                  formFieldLabel: "text-slate-700 dark:text-slate-300 text-xs font-semibold",
                  footerActionLink: "text-sky-600 dark:text-sky-400 hover:text-sky-500 font-semibold",
                  identityPreviewText: "text-slate-700 dark:text-slate-200",
                  identityPreviewEditButton: "text-sky-600 dark:text-sky-400",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </main>

      {/* Institutional Legal Footer */}
      <footer className="w-full py-4 text-center border-t border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-950/50 backdrop-blur-md">
        <p className="text-[11px] text-slate-500">
          AcademiaSync Institutional Attendance & Management System &bull; Secure Encrypted Session
        </p>
      </footer>
    </div>
  );
}
