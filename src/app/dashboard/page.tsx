import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";

export default async function DashboardDispatcherPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Strict Authoritative Redirect to the user's assigned role dashboard
  const userRole = (user.role || "student").toLowerCase();

  if (["principal", "hod", "teacher", "student"].includes(userRole)) {
    redirect(`/dashboard/${userRole}`);
  }

  // Fallback for students
  redirect("/dashboard/student");
}
