import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie");
    // Use the same secret priority as NextAuth config: AUTH_SECRET first, then NEXTAUTH_SECRET
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    // Try to get the token with different approaches
    let token = null;
    let tokenError = null;
    let tokenWithoutSecret = null;
    let tokenWithNextAuthSecret = null;
    let tokenWithAuthSecret = null;

    try {
      // Try with the combined secret
      token = await getToken({ req, secret });
    } catch (error) {
      tokenError = error instanceof Error ? error.message : String(error);
    }

    // Try without specifying secret (let NextAuth figure it out)
    try {
      tokenWithoutSecret = await getToken({ req });
    } catch {
      // ignore
    }

    // Try with NEXTAUTH_SECRET specifically
    try {
      tokenWithNextAuthSecret = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } catch {
      // ignore
    }

    // Try with AUTH_SECRET specifically
    try {
      tokenWithAuthSecret = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
      });
    } catch {
      // ignore
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

    // Get the raw session token
    const rawSessionToken =
      cookies["__Secure-authjs.session-token"] ??
      cookies["authjs.session-token"];

    const debugInfo = {
      timestamp: new Date().toISOString(),
      host: req.headers.get("host"),
      url: req.url,
      cookieHeader: cookieHeader?.slice(0, 500) ?? null,
      parsedCookies: cookies,
      authCookies: {
        sessionToken: rawSessionToken
          ? rawSessionToken.slice(0, 100) + "..."
          : null,
        sessionTokenLength: rawSessionToken?.length ?? 0,
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
        secretsMatch: process.env.AUTH_SECRET === process.env.NEXTAUTH_SECRET,
      },
      tokenTests: {
        withCombinedSecret: token ? "VALID" : "NULL",
        withoutSecret: tokenWithoutSecret ? "VALID" : "NULL",
        withNextAuthSecret: tokenWithNextAuthSecret ? "VALID" : "NULL",
        withAuthSecret: tokenWithAuthSecret ? "VALID" : "NULL",
      },
      tokenError,
      runtime: "nodejs", // This endpoint runs in Node.js runtime
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
