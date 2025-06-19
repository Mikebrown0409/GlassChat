import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    AUTH_DISCORD_ID: z.string().optional(),
    AUTH_DISCORD_SECRET: z.string().optional(),
    // Google OAuth (optional)
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    DATABASE_URL:
      process.env.NODE_ENV === "production"
        ? z.string().url("Invalid DATABASE_URL, expected absolute URL")
        : z.string().min(1),

    // AI API Keys
    OPENAI_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),

    // Upstash Redis
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Pusher (for real-time collaboration) - Optional but all must be provided if any is provided
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    PUSHER_CLUSTER: z.string().optional(),

    // Memory system configuration
    MEMORY_RETENTION_DAYS: z.coerce.number().min(1).max(365).default(90),
    MAX_MEMORIES_PER_CHAT: z.coerce.number().min(10).max(1000).default(100),
    MEMORY_CLEANUP_BATCH_SIZE: z.coerce.number().min(10).max(200).default(50),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Pusher public keys for client-side
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
    MEMORY_RETENTION_DAYS: process.env.MEMORY_RETENTION_DAYS,
    MAX_MEMORIES_PER_CHAT: process.env.MAX_MEMORIES_PER_CHAT,
    MEMORY_CLEANUP_BATCH_SIZE: process.env.MEMORY_CLEANUP_BATCH_SIZE,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
