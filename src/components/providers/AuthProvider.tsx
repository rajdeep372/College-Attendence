"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

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
      {children}
    </ClerkProvider>
  );
}

