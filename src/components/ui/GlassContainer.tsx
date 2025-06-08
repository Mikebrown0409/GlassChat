import React from "react";
import { clsx } from "clsx";

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: "low" | "medium" | "high";
  hover?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

export function GlassContainer({
  children,
  className,
  blur = "md",
  opacity = "medium",
  hover = false,
  rounded = "lg",
}: GlassContainerProps) {
  const blurClasses = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  const opacityClasses = {
    low: "bg-white/40 dark:bg-white/10",
    medium: "bg-white/80 dark:bg-white/20",
    high: "bg-white/95 dark:bg-white/30",
  };

  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  return (
    <div
      className={clsx(
        // Base glassmorphism styles
        blurClasses[blur],
        opacityClasses[opacity],
        roundedClasses[rounded],
        // Border and shadow
        "border border-white/20 dark:border-white/10",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        // Transition for smooth interactions
        "transition-all duration-200 ease-in-out",
        // Hover effects if enabled
        hover && [
          "hover:bg-white/90 dark:hover:bg-white/25",
          "hover:backdrop-blur-lg",
          "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
          "hover:border-white/30 dark:hover:border-white/20",
        ],
        className,
      )}
    >
      {children}
    </div>
  );
}

export default GlassContainer;
