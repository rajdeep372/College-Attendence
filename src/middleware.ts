import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/offline(.*)",
  "/offline.html",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
  "/icons/(.*)",
  "/api/public(.*)",
  "/api/users(.*)",
  "/api/routine(.*)",
  "/api/notifications(.*)",
  "/api/attendance(.*)",
]);

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const hasClerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

  // Protect all non-public routes when live Clerk keys are provided
  if (hasClerkKey) {
    if (!isPublicRoute(req)) {
      const session = await auth();
      if (!session.userId) {
        return session.redirectToSignIn();
      }

      // Role check from Clerk metadata if present
      const userRole = (session.sessionClaims?.metadata as { role?: string })?.role?.toLowerCase();
      const path = req.nextUrl.pathname.toLowerCase();

      // If user has a role and tries to visit a different role's dashboard, redirect to their assigned one
      if (userRole && path.startsWith("/dashboard/")) {
        const targetRole = path.split("/dashboard/")[1]?.split("/")[0];
        if (targetRole && targetRole !== userRole && ["principal", "hod", "teacher", "student"].includes(targetRole)) {
          const redirectUrl = new URL(`/dashboard/${userRole}`, req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
