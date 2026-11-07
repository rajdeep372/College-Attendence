"use client";

import React, { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles, GraduationCap } from "lucide-react";

function SignUpContent() {
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
              Join AcademiaSync <Sparkles className="w-4 h-4 text-sky-400" />
            </h1>
            <p className="text-xs text-sky-300/80">Register your Academic Account</p>
          </div>
        </div>

        {hasClerkKey ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        ) : (
          <div className="w-full p-8 rounded-3xl glass-card border border-sky-500/30 text-center shadow-[0_0_40px_rgba(56,189,248,0.2)]">
            <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-4">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Create Your Account</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              New accounts are registered via Clerk authentication. In demo mode, you can jump straight into the dashboards or sign in.
            </p>

            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
            >
              Go to Sign In / Demo Mode
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sky-400">Loading Sign Up...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
