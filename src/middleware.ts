import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

// Edge middleware: redirects unauthenticated users to /landing
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Debug: Check if session cookie is present
  const cookieHeader = req.headers.get("cookie");
  const hasSessionToken = cookieHeader?.includes("authjs.session-token");

  console.log(
    `[EDGE] ${pathname} - Session cookie present: ${hasSessionToken}`,
  );
  console.log(`[EDGE] Cookies: ${cookieHeader?.slice(0, 200) ?? "none"}`);

  // Public routes that don't require auth
  const publicPaths = [
    "/landing",
    "/login",
    "/register",
    "/api/debug-env",
    "/api/debug-cookies",
    "/api/debug-edge",
  ];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads");

  // Attempt to get the session using NextAuth's auth() function
  let session = null;
  try {
    session = await auth();
    console.log(`[EDGE] Session found: ${!!session}`);
  } catch (error) {
    console.error("[EDGE] Auth error", error);

    // If there's an auth error, clear all auth cookies
    const response = NextResponse.next();
    const cookieNames = [
      // NextAuth v5 cookie names
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "authjs.csrf-token",
      "__Host-authjs.csrf-token",
      "authjs.callback-url",
      "__Secure-authjs.callback-url",
      // Keep v4 names for backward compatibility
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
  if (isPublic && !session) {
    return NextResponse.next();
  }

  // If we're not on a public path and not authenticated, redirect to landing
  if (!isPublic && !session) {
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
