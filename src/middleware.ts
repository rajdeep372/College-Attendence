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
        (session.sessionClaims?.metadata as { role?: string })?.role?.toLowerCase();

      // If user hasn't set up role yet, allow direct access to onboarding
      if (!userRole) {
        if (path === "/" || path === "" || path === "/dashboard" || path === "/dashboard/") {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      } else {
        if (path === "/" || path === "" || path === "/dashboard" || path === "/dashboard/") {
          const redirectUrl = new URL(`/dashboard/${userRole}`, req.url);
          return NextResponse.redirect(redirectUrl);
        }

        // Cross-role isolation: prevent students/teachers from accessing higher role dashboards
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
