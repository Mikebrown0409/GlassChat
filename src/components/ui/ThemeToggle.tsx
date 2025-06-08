"use client";

import { SunIcon, MoonIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { useTheme, type GlassTheme } from "./ThemeProvider";
import { GlassContainer } from "./GlassContainer";
import { useState } from "react";
import { clsx } from "clsx";

export function ThemeToggle() {
  const { theme, glassTheme, toggleTheme, setGlassTheme } = useTheme();
  const [isGlassMenuOpen, setIsGlassMenuOpen] = useState(false);

  const glassThemes: {
    value: GlassTheme;
    label: string;
    description: string;
  }[] = [
    {
      value: "classic",
      label: "Classic",
      description: "Clean and minimal glass effect",
    },
    {
      value: "vibrant",
      label: "Vibrant",
      description: "Colorful gradient backgrounds",
    },
    {
      value: "minimal",
      label: "Minimal",
      description: "Subtle and understated",
    },
    { value: "neon", label: "Neon", description: "Cyberpunk-inspired glow" },
  ];

  return (
    <div className="relative flex items-center gap-2">
      {/* Theme Toggle Button */}
      <GlassContainer
        hover
        interactive
        scale
        className="p-2"
        blur="lg"
        opacity="medium"
        rounded="lg"
      >
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center transition-transform duration-200"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <SunIcon className="h-5 w-5 text-yellow-500" />
          )}
        </button>
      </GlassContainer>

      {/* Glass Theme Selector */}
      <GlassContainer
        hover
        interactive
        scale
        className="p-2"
        blur="lg"
        opacity="medium"
        rounded="lg"
      >
        <button
          onClick={() => setIsGlassMenuOpen(!isGlassMenuOpen)}
          className="flex h-8 w-8 items-center justify-center transition-transform duration-200"
          aria-label="Change glass theme"
        >
          <SwatchIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      </GlassContainer>

      {/* Glass Theme Dropdown */}
      {isGlassMenuOpen && (
        <div className="absolute top-12 right-0 z-50 w-64">
          <GlassContainer
            gradient
            bordered
            shadow="xl"
            className="space-y-2 p-4"
            blur="xl"
            animated
          >
            <div className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Glass Style
            </div>

            {glassThemes.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setGlassTheme(item.value);
                  setIsGlassMenuOpen(false);
                }}
                className={clsx(
                  "w-full rounded-lg p-3 text-left transition-all duration-200",
                  "hover:bg-white/20 dark:hover:bg-white/10",
                  "border border-transparent",
                  glassTheme === item.value && [
                    "bg-white/30 dark:bg-white/15",
                    "border-blue-300/50 dark:border-blue-400/30",
                    "shadow-lg shadow-blue-500/10",
                  ],
                )}
              >
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  {item.label}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {item.description}
                </div>
              </button>
            ))}
          </GlassContainer>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isGlassMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsGlassMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default ThemeToggle;
