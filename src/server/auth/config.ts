import { PrismaAdapter } from "@auth/prisma-adapter";
import { type User } from "@prisma/client";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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
    // Development-only credentials provider (allows creating test users)
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            id: "test-user",
            name: "Test User",
            credentials: {
              name: { label: "Name", type: "text", placeholder: "Test User" },
              email: {
                label: "Email",
                type: "email",
                placeholder: "test@example.com",
              },
            },
            async authorize(credentials) {
              try {
                if (!credentials?.name || !credentials?.email) {
                  console.error("Missing credentials:", {
                    name: !!credentials?.name,
                    email: !!credentials?.email,
                  });
                  return null;
                }

                const name = credentials.name as string;
                const email = credentials.email as string;

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                  console.error("Invalid email format:", email);
                  return null;
                }

                // Create or find user in database
                let user: User | null = await db.user.findUnique({
                  where: { email },
                });

                user ??= await db.user.create({
                  data: {
                    name,
                    email,
                    image: null,
                  },
                });

                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  image: user.image,
                };
              } catch (error: unknown) {
                console.error("Error in credentials authorize:", error);
                return null;
              }
            },
          }),
        ]
      : []),

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
