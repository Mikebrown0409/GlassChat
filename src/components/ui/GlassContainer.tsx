import React from "react";
import { clsx } from "clsx";
import { useTheme, glassThemeConfig } from "./ThemeProvider";

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg" | "xl" | "2xl";
  opacity?: "low" | "medium" | "high" | "ultra";
  hover?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  animated?: boolean;
  gradient?: boolean;
  bordered?: boolean;
  shadow?: "sm" | "md" | "lg" | "xl" | "2xl";
  interactive?: boolean;
  pulse?: boolean;
  scale?: boolean;
}

export function GlassContainer({
  children,
  className,
  blur = "md",
  opacity = "medium",
  hover = false,
  rounded = "lg",
  animated = true,
  gradient = false,
  bordered = true,
  shadow = "lg",
  interactive = false,
  pulse = false,
  scale = false,
}: GlassContainerProps) {
  const { theme, glassTheme } = useTheme();

  const blurClasses = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
    "2xl": "backdrop-blur-2xl",
  };

  const opacityClasses = {
    low: "bg-white/30 dark:bg-white/5",
    medium: "bg-white/60 dark:bg-white/15",
    high: "bg-white/80 dark:bg-white/25",
    ultra: "bg-white/95 dark:bg-white/35",
  };

  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  const shadowClasses = {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    "2xl": "shadow-2xl",
  };

  // Get theme-specific glass configuration
  const glassConfig = glassThemeConfig[glassTheme][theme];

  return (
    <div
      className={clsx(
        // Base glassmorphism styles
        blurClasses[blur],

        // Theme-aware background or opacity fallback
        gradient ? glassConfig.bg : opacityClasses[opacity],

        roundedClasses[rounded],

        // Border (conditional)
        bordered &&
          (gradient
            ? glassConfig.border
            : "border border-white/20 dark:border-white/10"),

        // Shadow
        gradient
          ? glassConfig.shadow
          : `${shadowClasses[shadow]} shadow-black/5 dark:shadow-black/20`,

        // Base transitions
        animated && "transition-all duration-300 ease-in-out",

        // Interactive effects
        interactive && [
          "cursor-pointer",
          "active:scale-[0.98]",
          "active:transition-transform active:duration-75",
        ],

        // Hover effects
        hover && [
          gradient
            ? glassConfig.hover
            : [
                "hover:bg-white/90 dark:hover:bg-white/30",
                "hover:backdrop-blur-lg",
                "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
                "hover:border-white/30 dark:hover:border-white/20",
              ],
        ],

        // Animation effects
        pulse && "animate-pulse",
        scale && "hover:scale-[1.02] active:scale-[0.98]",

        // Firefox fallback (no backdrop-filter support)
        "supports-[backdrop-filter]:bg-opacity-80",
        "supports-[backdrop-filter]:dark:bg-opacity-20",

        className,
      )}
    >
      {children}
    </div>
  );
}

export default GlassContainer;
