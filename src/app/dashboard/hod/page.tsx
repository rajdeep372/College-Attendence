import React, { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { HodDashboardClient } from "@/components/dashboard/HodDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function HodDashboardContent() {
  const currentUser = await getCurrentUser();
  return <HodDashboardClient user={currentUser} />;
}

export default function HodDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HodDashboardContent />
    </Suspense>
  );
}
