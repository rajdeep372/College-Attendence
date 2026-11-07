import React, { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { PrincipalDashboardClient } from "@/components/dashboard/PrincipalDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function PrincipalDashboardContent() {
  const currentUser = await getCurrentUser();
  return <PrincipalDashboardClient user={currentUser} />;
}

export default function PrincipalDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PrincipalDashboardContent />
    </Suspense>
  );
}
