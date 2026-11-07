"use client";

import React, { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react";

function SignUpContent() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      {/* Return to Institutional Portal link */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-sky-500/20 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(56,189,248,0.1)]"
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
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              Academia<span className="text-sky-400">Sync</span>
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-wider text-sky-300/80">
              New Academic Enrollment
            </p>
          </div>
        </div>

        {/* Advisory */}
        <div className="w-full p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/20 text-center text-xs text-slate-300">
          <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 text-[11px] mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict Institutional Credential Registration</span>
          </div>
          <span className="font-medium text-white block">
            Strict SSO: Please use your official college email ID provided by the institution.
          </span>
          <span className="block text-[10px] text-sky-300/80 mt-1">
            (Personal emails permitted exclusively for Principal testing &amp; system management)
          </span>
        </div>

        {/* Clerk SignUp */}
        <div className="w-full">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full max-w-full",
                card: "w-full max-w-full rounded-3xl glass-card border border-sky-400/30 shadow-[0_15px_45px_rgba(2,132,199,0.2)] bg-slate-900/90 text-white",
                headerTitle: "text-white text-base font-bold",
                headerSubtitle: "text-slate-300 text-xs",
                formButtonPrimary:
                  "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] text-xs py-2.5 rounded-xl transition-all",
                formFieldInput:
                  "bg-slate-950/80 border-sky-500/30 text-white placeholder-slate-500 focus:border-sky-400 rounded-xl text-sm",
                formFieldLabel: "text-slate-300 text-xs font-semibold",
                footerActionLink: "text-sky-400 hover:text-sky-300 font-semibold",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sky-400">
          <div className="w-8 h-8 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
