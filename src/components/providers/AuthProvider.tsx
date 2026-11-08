"use client";

import React from "react";
import { ClerkProvider, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If no publishable key is found, render children directly with a fallback notice
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: "#0284c7",
          colorBackground: "#0f172a",
          borderRadius: "0.875rem",
        },
        elements: {
          card: "backdrop-blur-xl bg-slate-900/80 border border-sky-500/20 shadow-[0_0_35px_rgba(56,189,248,0.2)]",
          navbar: "hidden",
          headerTitle: "text-white font-bold text-xl",
          headerSubtitle: "text-sky-300/80",
          formButtonPrimary: "bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(2,132,199,0.4)]",
          formFieldInput: "bg-slate-800/60 border-sky-500/30 text-white focus:border-sky-400 focus:ring-sky-400/20",
          footerActionLink: "text-sky-400 hover:text-sky-300 font-semibold",
        },
      }}
    >
      <ClerkLoading>
        <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white z-50">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl glass-card border border-sky-500/20 shadow-[0_0_50px_rgba(56,189,248,0.2)] animate-pulse">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <div className="text-sm font-extrabold tracking-tight text-white flex items-center justify-center gap-1">
                <span>Academia</span><span className="text-sky-400">Sync</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide">
                Verifying Institutional Session...
              </p>
            </div>
          </div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        {children}
      </ClerkLoaded>
    </ClerkProvider>
  );
}
