import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    // Discord OAuth (only if credentials are provided)
    ...(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
      ? [
          DiscordProvider({
            clientId: String(process.env.AUTH_DISCORD_ID),
            clientSecret: String(process.env.AUTH_DISCORD_SECRET),
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Google OAuth (only if credentials are provided)
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: String(process.env.AUTH_GOOGLE_ID),
            clientSecret: String(process.env.AUTH_GOOGLE_SECRET),
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    /**
     * ...add more providers here. For example GitHub, LinkedIn, etc.
     */
  ],
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token?.sub ?? "",
      },
    }),
  },
  session: {
    strategy: "jwt",
  },
  // Trust any host when NEXTAUTH_URL is not explicitly set (e.g. Vercel preview URLs)
  trustHost: true,
} satisfies NextAuthConfig;
