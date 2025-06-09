"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { GradientFlowContainer } from "./GradientFlowContainer";
import { clsx } from "clsx";
import { type ReactNode } from "react";

interface ResizableSidebarProps {
  children: ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export function ResizableSidebar({
  children,
  isCollapsed,
  onToggle,
  minWidth = 280,
  maxWidth = 480,
  defaultWidth = 320,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (event: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const newWidth = event.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleResize]);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleMouseUp);
  }, [handleResize, handleMouseUp]);

  return (
    <AnimatePresence mode="wait">
      {!isCollapsed ? (
        <motion.div
          ref={sidebarRef}
          className="relative flex h-full"
          style={{ width: isCollapsed ? 0 : width }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            <GradientFlowContainer
              variant="accent"
              intensity="medium"
              className="h-full rounded-l-none border-r-0"
            >
              <div className="h-full overflow-y-auto p-4">{children}</div>
            </GradientFlowContainer>
          </div>

          {/* Resize Handle */}
          <motion.div
            className={clsx(
              "w-2 cursor-col-resize bg-gradient-to-b from-orange-400/50 to-green-400/50",
              "transition-all duration-200 hover:from-orange-500/70 hover:to-green-500/70",
              "group relative",
            )}
            onMouseDown={handleMouseDown}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Visual indicator */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transform bg-white/30 transition-colors group-hover:bg-white/50" />

            {/* Resize dots */}
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 transform flex-col gap-1">
              <div className="h-1 w-1 rounded-full bg-white/50" />
              <div className="h-1 w-1 rounded-full bg-white/50" />
              <div className="h-1 w-1 rounded-full bg-white/50" />
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.button
          onClick={onToggle}
          className="group relative h-full w-12"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 48, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <GradientFlowContainer
            variant="accent"
            intensity="low"
            className="group-hover:intensity-medium flex h-full w-full items-center justify-center rounded-l-none border-r-0"
          >
            <motion.div
              className="text-white/70 transition-colors group-hover:text-white"
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </GradientFlowContainer>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// Sidebar content components
export function SidebarSection({
  title,
  children,
  isCollapsible = false,
}: {
  title: string;
  children: ReactNode;
  isCollapsible?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-3 flex cursor-pointer items-center justify-between"
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <h3 className="text-sm font-semibold tracking-wide text-white/90 uppercase">
          {title}
        </h3>
        {isCollapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-white/50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SidebarButton({
  children,
  isActive,
  onClick,
  icon,
}: {
  children: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={clsx(
        "mb-2 flex w-full items-center gap-3 rounded-lg p-3 text-left",
        "group relative overflow-hidden transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-orange-500/30 to-green-500/30 text-white shadow-lg"
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
      )}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-green-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        layoutId="sidebar-button-glow"
      />

      {icon && (
        <motion.div
          className="relative z-10"
          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {icon}
        </motion.div>
      )}

      <div className="relative z-10 text-sm font-medium">{children}</div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute top-1/2 right-2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-green-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          layoutId="active-indicator"
        />
      )}
    </motion.button>
  );
}
