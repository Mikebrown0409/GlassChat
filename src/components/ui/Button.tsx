import { clsx } from "clsx";
import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className, children, ...props },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-utility/60 disabled:opacity-40";

    const variants: Record<string, string> = {
      primary:
        "bg-gradient-brand text-white hover:brightness-110 active:scale-[.98]",
      secondary:
        "bg-surface-1 text-primary hover:bg-surface-0 active:scale-[.98]",
      ghost: "hover:bg-surface-1/60 text-primary active:scale-[.98]",
    };

    const sizes: Record<string, string> = {
      sm: "text-xs px-3 py-1.5",
      md: "text-sm px-4 py-2",
      lg: "text-base px-6 py-3",
      icon: "p-2",
    };

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
