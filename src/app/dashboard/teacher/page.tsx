import React, { Suspense } from "react";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { TeacherDashboardClient } from "@/components/dashboard/TeacherDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function TeacherDashboardContent() {
  const currentUser = await getCurrentUser();
  return <TeacherDashboardClient user={currentUser} />;
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
