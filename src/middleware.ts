import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Edge middleware: redirects unauthenticated users to /landing
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/landing", "/login", "/register", "/api/debug-env"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads");

  // Attempt to decode the NextAuth JWT (does NOT hit DB)
  let token: object | null = null;
  try {
    // Explicitly reference the secret so the env var is included in the edge
    // bundle. Without this reference the variable is omitted and the runtime
    // sees `undefined`, causing the cookie to be rejected. We also pass it
    // directly to getToken for clarity.
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    token = await getToken({ req, secret });
  } catch (error) {
    // If there's a JWT error, clear all auth cookies
    const response = NextResponse.next();
    const cookieNames = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
    ];

    cookieNames.forEach((name) => {
      response.cookies.delete(name);
    });

    // For public paths, simply continue without redirect so the page can render
    // after we cleared the invalid cookies, avoiding redirect loops.
    if (isPublic) {
      return response;
    }

    // For protected routes, send the user to /landing after clearing cookies.
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  // If we're on a public path and not authenticated, that's fine
  if (isPublic && !token) {
    return NextResponse.next();
  }

  // If we're not on a public path and not authenticated, redirect to landing
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to every path except the ones that start with the following:
    "/((?!_next/static|_next/image|favicon.ico|assets|uploads).*)",
  ],
};
