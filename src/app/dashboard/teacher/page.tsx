import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { TeacherDashboardClient } from "@/components/dashboard/TeacherDashboardClient";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

async function TeacherDashboardContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  // Strict Authoritative RBAC check
  if (currentUser.role.toLowerCase() !== "teacher") {
    redirect(`/dashboard/${currentUser.role.toLowerCase()}`);
  }

  return <TeacherDashboardClient user={currentUser} />;
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
