"use client";

import React, { Suspense } from "react";
import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

function SignInContent() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Return to Institutional Portal link */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-sky-500/20 backdrop-blur-md transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>College Portal</span>
        </Link>
      </div>

      <div className="w-full max-w-md my-8 flex flex-col items-center space-y-4">
        {/* Brand header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.4)] border border-white/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Academia<span className="text-sky-600 dark:text-sky-400">Sync</span>
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-wider text-sky-700 dark:text-sky-300/80">
              Institutional Single Sign-On
            </p>
          </div>
        </div>

        {/* Clerk Sign In Box with Instant Hydration Loading */}
        <div className="w-full">
          <ClerkLoading>
            <div className="w-full h-96 rounded-3xl glass-card border border-slate-200 dark:border-sky-400/20 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900/60 shadow-xl dark:shadow-[0_15px_45px_rgba(2,132,199,0.15)] animate-pulse">
              <div className="w-10 h-10 border-4 border-sky-400/30 border-t-sky-500 rounded-full animate-spin" />
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                Loading Sign-In Console...
              </div>
            </div>
          </ClerkLoading>

          <ClerkLoaded>
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-full",
                  card: "w-full max-w-full rounded-3xl glass-card border border-slate-200 dark:border-sky-400/30 shadow-xl dark:shadow-[0_15px_45px_rgba(2,132,199,0.2)] bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white",
                  headerTitle: "text-slate-900 dark:text-white text-base font-bold",
                  headerSubtitle: "text-slate-600 dark:text-slate-300 text-xs",
                  formButtonPrimary:
                    "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] text-xs py-2.5 rounded-xl transition-all",
                  formFieldInput:
                    "bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-sky-500/30 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-500 dark:focus:border-sky-400 rounded-xl text-sm",
                  formFieldLabel: "text-slate-700 dark:text-slate-300 text-xs font-semibold",
                  footerActionLink: "text-sky-600 dark:text-sky-400 hover:text-sky-500 font-semibold",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sky-400">
          <div className="w-8 h-8 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
