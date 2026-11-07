"use client";

import React, { useState, useEffect } from "react";
import { SignIn, SignInButton } from "@clerk/nextjs";
import { 
  GraduationCap, 
  ShieldCheck, 
  Lock, 
  Sparkles,
  ArrowRight,
  LogIn
} from "lucide-react";

export function InstitutionalSignInCard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto relative p-6 sm:p-8 rounded-3xl glass-card border border-sky-400/30 shadow-[0_20px_60px_rgba(2,132,199,0.22)] overflow-hidden">
      {/* 3D Ambient Neon Glow Orbs */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="text-center pb-6 border-b border-white/10 relative z-10">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(56,189,248,0.45)] border border-white/20 mb-3">
          <GraduationCap className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Strict Institutional Access</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Academic Sign-In
        </h1>

        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
          Enter your official college credentials. Scholars with roll numbers auto-route to Student portal; faculty auto-route to lecture consoles.
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Personal emails (@gmail.com, etc.) are rejected</span>
        </div>
      </div>

      {/* Center: Clerk <SignIn /> Interface */}
      <div className="pt-6 relative z-10">
        {!mounted ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
            <div className="w-8 h-8 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <span>Loading Clerk Authentication Terminal...</span>
          </div>
        ) : (
          <div className="w-full clerk-theme-container">
            <SignIn
              fallbackRedirectUrl="/"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-full",
                  card: "w-full max-w-full bg-transparent shadow-none border-0 p-0 text-white",
                  headerTitle: "text-white text-base font-bold",
                  headerSubtitle: "text-slate-300 text-xs",
                  socialButtonsBlockButton:
                    "w-full bg-slate-900/80 hover:bg-slate-800 border border-sky-500/25 text-white rounded-xl py-2.5 text-xs font-semibold shadow-sm transition-all",
                  socialButtonsBlockButtonText: "text-slate-200 font-semibold",
                  dividerLine: "bg-white/10",
                  dividerText: "text-slate-400 text-xs font-mono",
                  formFieldLabel: "text-slate-200 text-xs font-bold mb-1",
                  formFieldInput:
                    "w-full bg-slate-950/90 border border-sky-500/35 focus:border-sky-400 text-white placeholder-slate-500 rounded-xl text-sm py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all",
                  formButtonPrimary:
                    "w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold shadow-[0_0_25px_rgba(56,189,248,0.4)] text-sm py-3 rounded-xl transition-all cursor-pointer",
                  footerActionLink: "text-sky-400 hover:text-sky-300 font-bold text-xs",
                  footerActionText: "text-slate-400 text-xs",
                  identityPreviewText: "text-slate-200 font-medium",
                  identityPreviewEditButton: "text-sky-400 hover:text-sky-300",
                  formFieldSuccessText: "text-emerald-400 text-xs",
                  formFieldErrorText: "text-rose-400 text-xs font-semibold",
                  alert: "p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs",
                },
              }}
            />
          </div>
        )}
      </div>

      {/* Card Footer Security Tag */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono relative z-10">
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>SSO Gate Online</span>
        </span>
        <span>AcademiaSync v2.0</span>
      </div>
    </div>
  );
}
