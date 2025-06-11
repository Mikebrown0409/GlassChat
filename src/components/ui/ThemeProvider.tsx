"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

export type Theme = "dark"; // Only dark theme is supported now

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Set the theme statically to 'dark'
  const theme: Theme = "dark";

  useEffect(() => {
    // Apply the dark theme to the document root
    const root = window.document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
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
