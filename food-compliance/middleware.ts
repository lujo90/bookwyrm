import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/verify-email",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  // Allow public auth routes
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  // Allow public share links: /share/<any-token>
  if (pathname.startsWith("/share/")) {
    return true;
  }
  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/")
  ) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh the Supabase session cookie
  const { supabaseResponse, user } = await updateSession(request);

  // If the user is not logged in and the route is protected, redirect to /login
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve where they were trying to go so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If the user IS logged in and hits a public auth page, send them to dashboard
  if (user && PUBLIC_PATHS.some((p) => pathname === p)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
