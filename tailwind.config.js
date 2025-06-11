import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "hsl(var(--accent-primary))",
          secondary: "hsl(var(--accent-secondary))",
          utility: "hsl(var(--accent-utility))",
        },
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        border: {
          subtle: "var(--border-subtle)",
        },
        accent: {
          primary: "hsl(var(--accent-primary))",
          secondary: "hsl(var(--accent-secondary))",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg,hsl(var(--accent-primary)) 0%,hsl(var(--accent-secondary)) 100%)",
      },
      container: {
        padding: {
          DEFAULT: "1.25rem",
          lg: "2rem",
          xl: "3rem",
        },
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
