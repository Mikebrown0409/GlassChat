import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie");
    // Use the same secret priority as NextAuth config: AUTH_SECRET first, then NEXTAUTH_SECRET
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    // Try to get the token
    let token = null;
    let tokenError = null;
    try {
      token = await getToken({ req, secret });
    } catch (error) {
      tokenError = error instanceof Error ? error.message : String(error);
    }

    // Parse cookies
    const cookies: Record<string, string> = {};
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name && rest.length > 0) {
          cookies[name] = rest.join("=");
        }
      });
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      host: req.headers.get("host"),
      url: req.url,
      cookieHeader: cookieHeader?.slice(0, 500) ?? null,
      parsedCookies: cookies,
      authCookies: {
        sessionToken:
          cookies["__Secure-authjs.session-token"] ??
          cookies["authjs.session-token"] ??
          null,
        csrfToken:
          cookies["__Host-authjs.csrf-token"] ??
          cookies["authjs.csrf-token"] ??
          null,
        callbackUrl:
          cookies["__Secure-authjs.callback-url"] ??
          cookies["authjs.callback-url"] ??
          null,
      },
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
        AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        secretUsed: secret ? "SET" : "NOT SET",
        secretSource: process.env.AUTH_SECRET
          ? "AUTH_SECRET"
          : process.env.NEXTAUTH_SECRET
            ? "NEXTAUTH_SECRET"
            : "NONE",
      },
      token: token ? "VALID" : "NULL",
      tokenError,
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
