import React from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <DashboardSidebar role="principal" />
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}

