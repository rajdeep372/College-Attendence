"use client";

import React, { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles, GraduationCap } from "lucide-react";

function SignInContent() {
  const hasClerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-sky-500/20 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(56,189,248,0.1)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md my-8 flex flex-col items-center">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.4)] border border-white/20">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              AcademiaSync <Sparkles className="w-4 h-4 text-sky-400" />
            </h1>
            <p className="text-xs text-sky-300/80">Campus Portal Secure Access</p>
          </div>
        </div>

        {hasClerkKey ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
          />
        ) : (
          /* Development / Quick-Test Sandbox fallback when Clerk keys are in placeholder mode */
          <div className="w-full p-8 rounded-3xl glass-card border border-sky-500/30 text-center shadow-[0_0_40px_rgba(56,189,248,0.2)]">
            <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-4">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Clerk Auth Ready</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Clerk authentication is fully wired up! To connect your production Clerk instance, paste your credentials in <code className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60">.env.local</code>.
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-sky-500/20 text-left mb-6">
              <p className="text-xs font-semibold text-sky-400 mb-2">Quick Access Demo Mode:</p>
              <p className="text-xs text-slate-400 mb-4">
                You can test the Role-Based Redirect engine and all 4 dashboards right away:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/dashboard?role=principal"
                  className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-center font-medium transition-all"
                >
                  Principal Portal &rarr;
                </Link>
                <Link
                  href="/dashboard?role=hod"
                  className="p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-200 text-center font-medium transition-all"
                >
                  HOD Portal &rarr;
                </Link>
                <Link
                  href="/dashboard?role=teacher"
                  className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-center font-medium transition-all"
                >
                  Teacher Portal &rarr;
                </Link>
                <Link
                  href="/dashboard?role=student"
                  className="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-200 text-center font-medium transition-all"
                >
                  Student Portal &rarr;
                </Link>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
            >
              Continue to Role Hub
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sky-400">Loading Sign In...</div>}>
      <SignInContent />
    </Suspense>
  );
}
