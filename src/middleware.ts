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
  "/api/department(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const hasClerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

  if (hasClerkKey) {
    const session = await auth();
    const path = req.nextUrl.pathname.toLowerCase();

    // 1. Strictly keep authenticated users within their dashboard
    // Never allow authenticated users to be randomly bounced to the landing page "/"
    if (session.userId) {
      const userRole =
        (session.sessionClaims?.metadata as { role?: string })?.role?.toLowerCase() || "student";

      if (path === "/" || path === "") {
        const redirectUrl = new URL(`/dashboard/${userRole}`, req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Direct /dashboard or /dashboard/ visits to specific role portal
      if (path === "/dashboard" || path === "/dashboard/") {
        const redirectUrl = new URL(`/dashboard/${userRole}`, req.url);
        return NextResponse.redirect(redirectUrl);
      }

      // Cross-role isolation: Student cannot access Teacher/HOD/Principal
      if (path.startsWith("/dashboard/")) {
        const targetRole = path.split("/dashboard/")[1]?.split("/")[0];
        if (
          targetRole &&
          ["principal", "hod", "teacher", "student"].includes(targetRole) &&
          targetRole !== userRole
        ) {
          const redirectUrl = new URL(`/dashboard/${userRole}`, req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } else {
      // 2. Unauthenticated access protection for private routes
      if (!isPublicRoute(req)) {
        return session.redirectToSignIn({ returnBackUrl: req.url });
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
