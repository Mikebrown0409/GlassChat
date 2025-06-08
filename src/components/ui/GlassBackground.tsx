"use client";

import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";
import { type ReactNode } from "react";

interface GlassBackgroundProps {
  children: ReactNode;
  animated?: boolean;
  pattern?: "gradient" | "dots" | "grid" | "waves";
}

export function GlassBackground({
  children,
  animated = true,
  pattern = "gradient",
}: GlassBackgroundProps) {
  const { theme, glassTheme } = useTheme();

  const backgroundPatterns = {
    gradient: {
      light: {
        classic: "bg-gradient-to-br from-blue-50 via-white to-purple-50",
        vibrant: "bg-gradient-to-br from-pink-100 via-blue-50 to-purple-100",
        minimal: "bg-gradient-to-br from-gray-50 via-white to-gray-100",
        neon: "bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50",
      },
      dark: {
        classic: "bg-gradient-to-br from-gray-900 via-slate-900 to-black",
        vibrant: "bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900",
        minimal: "bg-gradient-to-br from-gray-800 via-gray-900 to-black",
        neon: "bg-gradient-to-br from-cyan-900 via-blue-900 to-purple-900",
      },
    },
    dots: {
      light: "bg-white",
      dark: "bg-gray-900",
    },
    grid: {
      light: "bg-gray-50",
      dark: "bg-gray-800",
    },
    waves: {
      light: "bg-gradient-to-br from-blue-50 to-indigo-100",
      dark: "bg-gradient-to-br from-gray-900 to-blue-900",
    },
  };

  const getPatternOverlay = () => {
    switch (pattern) {
      case "dots":
        return (
          <div
            className={clsx(
              "absolute inset-0 opacity-40",
              theme === "light" ? "bg-gray-900" : "bg-white",
            )}
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />
        );
      case "grid":
        return (
          <div
            className={clsx(
              "absolute inset-0 opacity-20",
              theme === "light" ? "bg-gray-900" : "bg-white",
            )}
            style={{
              backgroundImage: `
                linear-gradient(currentColor 1px, transparent 1px),
                linear-gradient(90deg, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "30px 30px",
            }}
          />
        );
      case "waves":
        return (
          <div className="absolute inset-0 opacity-30">
            <svg
              className="h-full w-full"
              viewBox="0 0 1200 800"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="wave-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor={theme === "light" ? "#3B82F6" : "#60A5FA"}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={theme === "light" ? "#8B5CF6" : "#A78BFA"}
                    stopOpacity="0.1"
                  />
                </linearGradient>
              </defs>
              <path
                d="M0,400 Q300,200 600,400 T1200,400 L1200,800 L0,800 Z"
                fill="url(#wave-gradient)"
                className={animated ? "animate-pulse" : ""}
              />
              <path
                d="M0,500 Q400,300 800,500 T1200,500 L1200,800 L0,800 Z"
                fill="url(#wave-gradient)"
                opacity="0.5"
                className={animated ? "animate-pulse" : ""}
                style={{ animationDelay: "1s" }}
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getBackgroundClass = () => {
    if (pattern === "gradient") {
      return backgroundPatterns.gradient[theme][glassTheme];
    }
    return backgroundPatterns[pattern as keyof typeof backgroundPatterns][
      theme
    ];
  };

  return (
    <div
      className={clsx(
        "relative min-h-screen overflow-hidden",
        getBackgroundClass(),
        animated && pattern === "gradient" && "bg-gradient-animated",
      )}
    >
      {/* Pattern overlay */}
      {getPatternOverlay()}

      {/* Animated gradient overlay for extra depth */}
      {animated && pattern === "gradient" && (
        <div className="absolute inset-0 opacity-50">
          <div
            className={clsx(
              "animate-gradient-shift absolute inset-0",
              theme === "light"
                ? "bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20"
                : "bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20",
            )}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default GlassBackground;
