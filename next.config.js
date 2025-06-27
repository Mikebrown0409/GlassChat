/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  // Experimental features for performance and WebAssembly
  experimental: {
    webpackBuildWorker: true,
  },

  // WebAssembly and performance webpack config
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Add fallbacks for browser compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      cluster: false,
    };

    // Exclude server-only modules from client bundles
    if (!isServer) {
      config.externals = config.externals || [];

      // In production, exclude all Redis dependencies from client
      if (!dev) {
        config.externals.push({
          ioredis: "commonjs ioredis",
          redis: "commonjs redis",
        });
      } else {
        // In development, allow dynamic requires for local testing
        config.externals.push({
          ioredis: "ioredis",
          redis: "redis",
        });
      }
    }

    return config;
  },

  // Performance optimizations for 60+ FPS target
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },

  // Environment variable passthrough
  env: {
    NEXT_PUBLIC_APP_NAME: "GlassChat",

    // Make secrets visible to Edge / middleware
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    // Expose canonical production URL for client-side redirects
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXTAUTH_URL ?? "https://glass-chat-two.vercel.app",
  },

  // modularizeImports for Radix
  modularizeImports: {
    "@radix-ui/react-*": {
      transform: "@radix-ui/react-{{member}}",
    },
  },

  // Security headers (applied to all routes)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.githubusercontent.com https://*.unsplash.com; connect-src 'self' wss://*.pusher.com https://*.pusher.com wss://sockjs-us3.pusher.com https://sockjs-us3.pusher.com wss://ws-us3.pusher.com https://ws-us3.pusher.com; media-src 'none'; object-src 'none'; frame-ancestors 'self'; base-uri 'self';",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default config;
