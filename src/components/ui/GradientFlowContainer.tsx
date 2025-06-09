"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";
import { type ReactNode, useState } from "react";

interface GradientFlowContainerProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
  intensity?: "low" | "medium" | "high";
  variant?: "primary" | "secondary" | "accent";
}

export function GradientFlowContainer({
  children,
  className,
  isActive = false,
  intensity = "medium",
  variant = "primary",
}: GradientFlowContainerProps) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic gradient configurations
  const gradients = {
    light: {
      primary: {
        base: "bg-gradient-to-br from-teal-400/20 via-purple-400/20 to-indigo-400/20",
        active:
          "bg-gradient-to-br from-teal-500/30 via-purple-500/30 to-indigo-500/30",
        hover:
          "bg-gradient-to-br from-teal-500/25 via-purple-500/25 to-indigo-500/25",
      },
      secondary: {
        base: "bg-gradient-to-r from-orange-200/30 to-green-200/30",
        active: "bg-gradient-to-r from-orange-300/40 to-green-300/40",
        hover: "bg-gradient-to-r from-orange-300/35 to-green-300/35",
      },
      accent: {
        base: "bg-gradient-to-tr from-cyan-300/20 to-purple-300/20",
        active: "bg-gradient-to-tr from-cyan-400/30 to-purple-400/30",
        hover: "bg-gradient-to-tr from-cyan-400/25 to-purple-400/25",
      },
    },
    dark: {
      primary: {
        base: "bg-gradient-to-br from-teal-600/30 via-purple-600/30 to-indigo-600/30",
        active:
          "bg-gradient-to-br from-teal-500/40 via-purple-500/40 to-indigo-500/40",
        hover:
          "bg-gradient-to-br from-teal-500/35 via-purple-500/35 to-indigo-500/35",
      },
      secondary: {
        base: "bg-gradient-to-r from-orange-500/30 to-green-500/30",
        active: "bg-gradient-to-r from-orange-400/40 to-green-400/40",
        hover: "bg-gradient-to-r from-orange-400/35 to-green-400/35",
      },
      accent: {
        base: "bg-gradient-to-tr from-cyan-500/30 to-purple-500/30",
        active: "bg-gradient-to-tr from-cyan-400/40 to-purple-400/40",
        hover: "bg-gradient-to-tr from-cyan-400/35 to-purple-400/35",
      },
    },
  };

  const currentGradient = gradients[theme][variant];
  const gradientClass = isActive
    ? currentGradient.active
    : isHovered
      ? currentGradient.hover
      : currentGradient.base;

  // Intensity-based effects
  const intensityEffects = {
    low: "backdrop-blur-sm border border-white/10",
    medium: "backdrop-blur-md border border-white/20 shadow-lg",
    high: "backdrop-blur-lg border border-white/30 shadow-xl shadow-purple-500/20",
  };

  return (
    <motion.div
      className={clsx(
        "relative overflow-hidden rounded-xl transition-all duration-500",
        gradientClass,
        intensityEffects[intensity],
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(45deg, 
            ${theme === "dark" ? "#0f766e, #7c3aed, #4338ca" : "#14b8a6, #a855f7, #6366f1"})`,
          backgroundSize: "400% 400%",
        }}
        animate={{
          backgroundPosition: isActive
            ? ["0% 50%", "100% 50%", "0% 50%"]
            : ["0% 50%", "50% 50%", "0% 50%"],
        }}
        transition={{
          duration: isActive ? 2 : 4,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Shimmer effect for active state */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            exit={{ x: "100%" }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Corner accent */}
      <motion.div
        className={clsx(
          "absolute -top-1 -right-1 h-3 w-3 rounded-full",
          theme === "dark"
            ? "bg-gradient-to-br from-orange-400 to-green-400"
            : "bg-gradient-to-br from-orange-500 to-green-500",
        )}
        animate={
          isActive
            ? {
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }
            : {}
        }
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
}

// Specialized variants for different use cases
export function ChatMessageContainer({
  children,
  isUser,
  isTyping,
}: {
  children: ReactNode;
  isUser: boolean;
  isTyping?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      <GradientFlowContainer
        variant={isUser ? "secondary" : "primary"}
        isActive={isTyping}
        intensity={isTyping ? "high" : "medium"}
        className={clsx("mb-4 max-w-[80%] p-4", isUser ? "ml-auto" : "mr-auto")}
      >
        {children}
      </GradientFlowContainer>
    </motion.div>
  );
}

export function FloatingInputContainer({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) {
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 w-full max-w-4xl -translate-x-1/2 transform px-6"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <GradientFlowContainer
        isActive={isActive}
        intensity="high"
        className="p-4 shadow-2xl"
      >
        {children}
      </GradientFlowContainer>
    </motion.div>
  );
}
