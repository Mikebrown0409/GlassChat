// @ts-ignore
import animatePlugin from "tailwindcss-animate";
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
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          user: "var(--surface-user)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          secondary: "var(--text-secondary)",
          placeholder: "var(--text-placeholder)",
        },
        border: {
          subtle: "var(--border-subtle)",
        },
        accent: {
          100: "hsl(var(--accent-100))",
          200: "hsl(var(--accent-200))",
          500: "hsl(var(--accent-500))",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg,hsl(var(--accent-primary)) 0%,hsl(var(--accent-secondary)) 100%)",
      },
      boxShadow: {
        message: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "message-dark": "0 1px 2px 0 rgb(0 0 0 / 0.2)",
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
  plugins: [animatePlugin],
};
