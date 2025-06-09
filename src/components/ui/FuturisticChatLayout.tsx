"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import {
  GradientFlowContainer,
  FloatingInputContainer,
} from "./GradientFlowContainer";
import {
  ResizableSidebar,
  SidebarSection,
  SidebarButton,
} from "./ResizableSidebar";
import { clsx } from "clsx";

interface FuturisticChatLayoutProps {
  messages: Array<{
    id: string;
    content: string;
    isUser: boolean;
    isTyping?: boolean;
  }>;
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  className?: string;
}

export function FuturisticChatLayout({
  messages,
  onSendMessage,
  isTyping = false,
  className,
}: FuturisticChatLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4");
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Dynamic background based on activity
  const [activityLevel, setActivityLevel] = useState<
    "idle" | "active" | "intense"
  >("idle");

  useEffect(() => {
    if (isTyping) {
      setActivityLevel("intense");
    } else if (inputValue.length > 0) {
      setActivityLevel("active");
    } else {
      setActivityLevel("idle");
    }
  }, [isTyping, inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const models = [
    { id: "gpt-4", name: "GPT-4", status: "online" },
    { id: "claude-3", name: "Claude 3", status: "online" },
    { id: "gemini-pro", name: "Gemini Pro", status: "busy" },
  ];

  return (
    <div className={clsx("flex h-screen overflow-hidden", className)}>
      {/* Dynamic Background */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{
          background:
            theme === "dark"
              ? [
                  "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
                  "linear-gradient(135deg, #0f766e 0%, #7c3aed 50%, #4338ca 100%)",
                  "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
                ]
              : [
                  "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                  "linear-gradient(135deg, #14b8a6 0%, #a855f7 50%, #6366f1 100%)",
                  "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                ],
        }}
        transition={{
          duration:
            activityLevel === "intense"
              ? 2
              : activityLevel === "active"
                ? 4
                : 8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Floating particles effect */}
      <div className="pointer-events-none fixed inset-0 -z-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className={clsx(
              "absolute h-2 w-2 rounded-full",
              theme === "dark" ? "bg-cyan-400/20" : "bg-purple-400/20",
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 10 - 5, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <ResizableSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <SidebarSection title="Models">
          {models.map((model) => (
            <SidebarButton
              key={model.id}
              isActive={selectedModel === model.name}
              onClick={() => setSelectedModel(model.name)}
              icon={
                <div
                  className={clsx(
                    "h-3 w-3 rounded-full",
                    model.status === "online"
                      ? "bg-green-400"
                      : "bg-orange-400",
                  )}
                />
              }
            >
              {model.name}
            </SidebarButton>
          ))}
        </SidebarSection>

        <SidebarSection title="History" isCollapsible>
          <div className="space-y-2">
            <SidebarButton>Conversation 1</SidebarButton>
            <SidebarButton>Conversation 2</SidebarButton>
            <SidebarButton>Conversation 3</SidebarButton>
          </div>
        </SidebarSection>

        <SidebarSection title="Collaboration" isCollapsible>
          <div className="space-y-2">
            <SidebarButton
              icon={<div className="h-3 w-3 rounded-full bg-green-400" />}
            >
              Share Session
            </SidebarButton>
            <SidebarButton
              icon={<div className="h-3 w-3 rounded-full bg-blue-400" />}
            >
              Export Chat
            </SidebarButton>
          </div>
        </SidebarSection>
      </ResizableSidebar>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <motion.header
          className="relative z-20 flex h-16 items-center justify-between px-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GradientFlowContainer
            variant="accent"
            intensity="low"
            className="px-6 py-3"
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                GlintChat
              </motion.div>
              <div className="text-sm text-white/60">
                Connected to {selectedModel}
              </div>
            </div>
          </GradientFlowContainer>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              className="rounded-lg bg-gradient-to-r from-orange-500/20 to-green-500/20 p-3 transition-all duration-200 hover:from-orange-500/30 hover:to-green-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: theme === "dark" ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </motion.div>
            </motion.button>

            {/* Sidebar Toggle */}
            <motion.button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="rounded-lg bg-gradient-to-r from-teal-500/20 to-purple-500/20 p-3 transition-all duration-200 hover:from-teal-500/30 hover:to-purple-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d={
                    sidebarCollapsed
                      ? "M3 12h18M3 6h18M3 18h18"
                      : "M21 6H3M15 12H3M17 18H3"
                  }
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          </div>
        </motion.header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32">
          <div className="mx-auto max-w-4xl space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -50, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: "easeOut",
                  }}
                  className="w-full"
                >
                  <GradientFlowContainer
                    variant={message.isUser ? "secondary" : "primary"}
                    isActive={message.isTyping}
                    intensity={message.isTyping ? "high" : "medium"}
                    className={clsx(
                      "relative max-w-[85%] p-6",
                      message.isUser ? "ml-auto" : "mr-auto",
                    )}
                  >
                    <div className="leading-relaxed text-white/90">
                      {message.content}
                    </div>

                    {/* Message timestamp */}
                    <div className="mt-2 text-xs text-white/40">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </GradientFlowContainer>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-[85%]"
                >
                  <GradientFlowContainer
                    variant="primary"
                    isActive={true}
                    intensity="high"
                    className="p-6"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-white/60">Thinking</div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-white/60"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.6, 1, 0.6],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </GradientFlowContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Input */}
        <FloatingInputContainer
          isActive={isInputFocused || inputValue.length > 0}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Type your message..."
                className="w-full border-none bg-transparent text-lg text-white placeholder-white/50 outline-none"
              />

              {/* Input underline effect */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-teal-400 to-purple-400"
                initial={{ width: "0%" }}
                animate={{ width: isInputFocused ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <motion.button
              type="submit"
              disabled={!inputValue.trim()}
              className={clsx(
                "rounded-xl px-6 py-3 font-semibold transition-all duration-200",
                "bg-gradient-to-r from-orange-500 to-green-500",
                "hover:from-orange-400 hover:to-green-400",
                "disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600",
                "shadow-lg hover:shadow-xl",
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Send
            </motion.button>
          </form>
        </FloatingInputContainer>
      </div>
    </div>
  );
}
