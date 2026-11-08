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

    // 1. Strictly route authenticated users away from public pages!
    // Never allow authenticated users to be trapped on public pages, sign-in, or sign-up
    if (session.userId) {
      const claims = session.sessionClaims as Record<string, any> | undefined;
      const userRole = (
        claims?.metadata?.role ||
        claims?.publicMetadata?.role ||
        claims?.role ||
        ""
      )?.toLowerCase();

      // If user has a verified role in Clerk metadata, route directly to role dashboard
      // Never show public landing, sign-in, sign-up, or onboarding screen again on subsequent visits!
      if (userRole && ["principal", "hod", "teacher", "student"].includes(userRole)) {
        const isLandingOrOnboarding =
          path === "" ||
          path === "/" ||
          path.startsWith("/sign-in") ||
          path.startsWith("/sign-up") ||
          path.startsWith("/onboarding") ||
          path === "/dashboard" ||
          path === "/dashboard/";

        if (isLandingOrOnboarding) {
          return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
        }
      } else {
        // Fallback for authenticated users without metadata role yet
        const isPublicLanding =
          path === "" ||
          path === "/" ||
          path.startsWith("/sign-in") ||
          path.startsWith("/sign-up");

        if (isPublicLanding) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }

      // Cross-role isolation: prevent students/teachers from accessing higher role dashboards
      if (path.startsWith("/dashboard/")) {
        const targetRole = path.split("/dashboard/")[1]?.split("/")[0];
        if (
          targetRole &&
          ["principal", "hod", "teacher", "student"].includes(targetRole) &&
          userRole &&
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
