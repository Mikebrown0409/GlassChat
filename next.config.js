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
    };

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
  },

  // modularizeImports for Radix
  modularizeImports: {
    "@radix-ui/react-*": {
      transform: "@radix-ui/react-{{member}}",
    },
  },
};

export default config;
