"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type ReactNode } from "react";

export type Theme = "light" | "dark";
export type GlassTheme = "classic" | "vibrant" | "minimal" | "neon";

interface ThemeContextType {
  theme: Theme;
  glassTheme: GlassTheme;
  setTheme: (theme: Theme) => void;
  setGlassTheme: (glassTheme: GlassTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [glassTheme, setGlassTheme] = useState<GlassTheme>("classic");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("glasschat-theme") as Theme;
    const savedGlassTheme = localStorage.getItem(
      "glasschat-glass-theme",
    ) as GlassTheme;

    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Detect system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
    }

    if (savedGlassTheme) {
      setGlassTheme(savedGlassTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    // Apply glass theme data attribute
    root.setAttribute("data-glass-theme", glassTheme);

    localStorage.setItem("glasschat-theme", theme);
    localStorage.setItem("glasschat-glass-theme", glassTheme);
  }, [theme, glassTheme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        glassTheme,
        setTheme,
        setGlassTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Theme configurations for different glass styles
export const glassThemeConfig = {
  classic: {
    light: {
      bg: "bg-white/80",
      border: "border-white/20",
      shadow: "shadow-lg shadow-black/5",
      hover: "hover:bg-white/90 hover:border-white/30",
    },
    dark: {
      bg: "bg-white/20",
      border: "border-white/10",
      shadow: "shadow-lg shadow-black/20",
      hover: "hover:bg-white/25 hover:border-white/20",
    },
  },
  vibrant: {
    light: {
      bg: "bg-gradient-to-br from-blue-50/90 via-purple-50/80 to-pink-50/90",
      border: "border-blue-200/30",
      shadow: "shadow-xl shadow-blue-500/10",
      hover:
        "hover:from-blue-50/95 hover:via-purple-50/90 hover:to-pink-50/95 hover:border-blue-300/40",
    },
    dark: {
      bg: "bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-pink-900/30",
      border: "border-blue-400/20",
      shadow: "shadow-xl shadow-blue-500/20",
      hover:
        "hover:from-blue-900/40 hover:via-purple-900/30 hover:to-pink-900/40 hover:border-blue-400/30",
    },
  },
  minimal: {
    light: {
      bg: "bg-gray-50/70",
      border: "border-gray-200/20",
      shadow: "shadow-md shadow-gray-900/5",
      hover: "hover:bg-gray-50/85 hover:border-gray-300/25",
    },
    dark: {
      bg: "bg-gray-900/40",
      border: "border-gray-600/15",
      shadow: "shadow-md shadow-black/25",
      hover: "hover:bg-gray-900/50 hover:border-gray-500/20",
    },
  },
  neon: {
    light: {
      bg: "bg-cyan-50/85",
      border: "border-cyan-300/40",
      shadow: "shadow-lg shadow-cyan-500/20",
      hover:
        "hover:bg-cyan-50/95 hover:border-cyan-400/50 hover:shadow-cyan-500/30",
    },
    dark: {
      bg: "bg-cyan-900/25",
      border: "border-cyan-400/30",
      shadow: "shadow-lg shadow-cyan-500/25",
      hover:
        "hover:bg-cyan-900/35 hover:border-cyan-300/40 hover:shadow-cyan-400/35",
    },
  },
} as const;
