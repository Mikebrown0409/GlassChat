"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "~/utils/cn";

const sidebarNavItemVariants = cva(
  "group w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors",
  {
    variants: {
      active: {
        true: "bg-brand-primary/15 text-primary",
        false: "text-muted hover:bg-surface-1/60 hover:text-primary",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export interface SidebarNavItemProps
  extends React.ComponentPropsWithoutRef<typeof motion.div>,
    VariantProps<typeof sidebarNavItemVariants> {
  asChild?: boolean;
}

export const SidebarNavItem = React.forwardRef<
  React.ElementRef<typeof motion.div>,
  SidebarNavItemProps
>(({ className, active, ...props }, ref) => (
  <motion.div
    ref={ref}
    {...props}
    className={cn(sidebarNavItemVariants({ active }), className)}
    layout
  />
));
SidebarNavItem.displayName = "SidebarNavItem";
