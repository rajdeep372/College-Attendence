"use client";

import React from "react";
import { DashboardAppBar } from "@/components/navigation/DashboardAppBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/90 dark:bg-slate-950/80 w-full max-w-full overflow-x-hidden transition-colors duration-200">
      {/* Interactive Institutional App Bar with Notifications & Department Audits */}
      <DashboardAppBar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
