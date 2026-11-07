import React, { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { StudentDashboardClient } from "@/components/dashboard/StudentDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function StudentDashboardContent() {
  const currentUser = await getCurrentUser();
  return <StudentDashboardClient user={currentUser} />;
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}
