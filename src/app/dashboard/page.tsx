"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { 
  validateInstitutionalEmail, 
  deriveRoleFromEmail, 
  getRoleDashboardPath 
} from "@/lib/auth-rbac";
import { RefreshCw, ShieldCheck } from "lucide-react";

function DashboardAutoRouter() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/");
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress || "";
    const validation = validateInstitutionalEmail(email);

    if (!validation.valid) {
      router.replace("/");
      return;
    }

    // Verify if user is onboarded
    async function checkOnboardingAndRedirect() {
      try {
        const res = await fetch("/api/onboarding");
        const data = await res.json();

        if (data.success && data.onboarded) {
          const role = data.user?.role || validation.role || deriveRoleFromEmail(email);
          const targetPath = getRoleDashboardPath(role);
          router.replace(targetPath);
        } else {
          router.replace("/onboarding");
        }
      } catch {
        // Fallback to role dashboard
        const role = validation.role || deriveRoleFromEmail(email);
        router.replace(getRoleDashboardPath(role));
      }
    }

    checkOnboardingAndRedirect();
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-fade-in">
      <div className="relative p-6 rounded-3xl glass-card border border-sky-500/30 max-w-sm w-full space-y-4 shadow-[0_10px_35px_rgba(2,132,199,0.15)]">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Authenticating Session</h2>
          <p className="text-xs text-slate-300 mt-1">
            Validating institutional role and redirecting to your designated station...
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Single-Role RBAC Enforced</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardDispatcher() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardAutoRouter />
    </Suspense>
  );
}
