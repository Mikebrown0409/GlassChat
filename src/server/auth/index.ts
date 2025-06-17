import NextAuth from "next-auth";
import { authConfig } from "./config";

// Use auth() directly without React cache. Caching here would persist the
// session result across *all* subsequent requests in the same edge/serverless
// instance, leading to stale sessions and redirect loops in production.
// NextAuth already memoises internal calls per–request, so additional
// component-level caching is unnecessary and harmful.

const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export { auth, handlers, signIn, signOut };
