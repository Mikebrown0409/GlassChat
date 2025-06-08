"use client";

import { useState } from "react";
import { GlassContainer } from "@/components/ui/GlassContainer";
import { GlassBackground } from "@/components/ui/GlassBackground";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/components/ui/ThemeProvider";

export default function GlassTestPage() {
  const [animationCount, setAnimationCount] = useState(10);
  const { theme, glassTheme } = useTheme();

  const patterns = ["gradient", "dots", "grid", "waves"] as const;
  const [currentPattern, setCurrentPattern] =
    useState<(typeof patterns)[number]>("gradient");

  return (
    <GlassBackground animated pattern={currentPattern}>
      {/* Header */}
      <div className="absolute top-4 right-4 left-4 z-50 flex items-center justify-between">
        <GlassContainer
          gradient
          blur="xl"
          shadow="xl"
          className="px-4 py-2"
          animated
        >
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Glassmorphism Performance Test
          </h1>
        </GlassContainer>

        <ThemeToggle />
      </div>

      {/* Controls */}
      <div className="p-8 pt-20">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Pattern Selector */}
          <GlassContainer
            gradient
            blur="lg"
            shadow="lg"
            className="p-6"
            animated
            hover
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Background Pattern
            </h2>
            <div className="flex flex-wrap gap-2">
              {patterns.map((pattern) => (
                <button
                  key={pattern}
                  onClick={() => setCurrentPattern(pattern)}
                  className={`rounded-lg px-4 py-2 transition-all duration-200 ${
                    currentPattern === pattern
                      ? "bg-blue-500 text-white"
                      : "bg-white/20 text-gray-700 hover:bg-white/30 dark:text-gray-300"
                  }`}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                </button>
              ))}
            </div>
          </GlassContainer>

          {/* Animation Count Control */}
          <GlassContainer
            gradient
            blur="lg"
            shadow="lg"
            className="p-6"
            animated
            hover
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Animation Stress Test
            </h2>
            <div className="flex items-center gap-4">
              <label className="text-gray-700 dark:text-gray-300">
                Animated Elements: {animationCount}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={animationCount}
                onChange={(e) => setAnimationCount(Number(e.target.value))}
                className="flex-1"
              />
            </div>
          </GlassContainer>

          {/* Performance Info */}
          <GlassContainer
            gradient
            blur="lg"
            shadow="lg"
            className="p-6"
            animated
            hover
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Current Settings
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Theme:
                </span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {theme}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Glass Theme:
                </span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {glassTheme}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Pattern:
                </span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {currentPattern}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Animations:
                </span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {animationCount}
                </span>
              </div>
            </div>
          </GlassContainer>

          {/* Animated Elements Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: animationCount }, (_, i) => (
              <GlassContainer
                key={i}
                gradient
                blur="lg"
                shadow="lg"
                className="h-32 p-4"
                animated
                hover
                scale
                pulse={i % 3 === 0}
              >
                <div className="flex h-full flex-col items-center justify-center">
                  <div
                    className={`mb-2 text-2xl ${i % 4 === 0 ? "animate-glass-float" : ""}`}
                  >
                    {["🌟", "✨", "💎", "🔮"][i % 4]}
                  </div>
                  <div className="text-center text-sm text-gray-700 dark:text-gray-300">
                    Element {i + 1}
                  </div>
                </div>
              </GlassContainer>
            ))}
          </div>

          {/* Browser Compatibility Info */}
          <GlassContainer
            gradient
            blur="lg"
            shadow="lg"
            className="p-6"
            animated
            hover
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Browser Compatibility
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Chrome/Edge: Full backdrop-filter support
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Safari: Full backdrop-filter support
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Firefox: Fallback to solid backgrounds
                </span>
              </div>
            </div>
          </GlassContainer>

          {/* Performance Tips */}
          <GlassContainer
            gradient
            blur="lg"
            shadow="lg"
            className="p-6"
            animated
            hover
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performance Optimizations
            </h2>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• GPU acceleration with transform3d</li>
              <li>• Reduced motion support for accessibility</li>
              <li>• Efficient CSS animations with will-change</li>
              <li>• Optimized backdrop-filter usage</li>
              <li>• Firefox fallback for unsupported features</li>
            </ul>
          </GlassContainer>
        </div>
      </div>
    </GlassBackground>
  );
}
