import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Edge middleware: redirects unauthenticated users to /landing
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Attempt to decode the NextAuth JWT (does NOT hit DB)
  let token: object | null = null;
  try {
    token = await getToken({ req, secret: process.env.AUTH_SECRET });
  } catch {
    // swallow, will trigger stale-cookie clearing below
  }

  // Public routes that don't require auth
  const publicPaths = ["/landing", "/login"];
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads");

  if (isPublic && !token) {
    // Clear cookies if invalid and continue to public page
    const response = NextResponse.next();
    const cookieNames = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
    ];
    cookieNames.forEach((name) => {
      if (req.cookies.get(name)) {
        response.cookies.set(name, "", { path: "/", expires: new Date(0) });
      }
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to every path except the ones that start with the following:
    "/((?!_next/static|_next/image|favicon.ico|assets|uploads).*)",
  ],
};
