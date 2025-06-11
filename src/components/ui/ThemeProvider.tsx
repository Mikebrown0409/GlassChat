"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedTheme = window.localStorage.getItem(storageKey) as Theme;
        if (storedTheme) {
          return storedTheme;
        }
      } catch (e) {
        console.error("Failed to read theme from localStorage", e);
      }
    }
    return defaultTheme;
  });

  const applyTheme = useCallback((themeToApply: Theme) => {
    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove("light", "dark");
    root.removeAttribute("data-theme");

    let newTheme = themeToApply;
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      newTheme = systemTheme;
    }

    // Apply the new theme
    root.classList.add(newTheme);
    root.setAttribute("data-theme", newTheme);

    // Update the dark class
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Force a reflow to ensure the theme is applied
    void document.body.offsetHeight;
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, newTheme);
      }
    } catch (e) {
      console.error("Failed to save theme to localStorage", e);
    }
    setTheme(newTheme);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: handleSetTheme,
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
