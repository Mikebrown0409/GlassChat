"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";

interface ModernGlassChatLayoutProps {
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

export function ModernGlassChatLayout({
  messages,
  onSendMessage,
  isTyping = false,
  className,
}: ModernGlassChatLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const models = [
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "Most capable",
      status: "online",
    },
    {
      id: "claude-3",
      name: "Claude 3",
      description: "Best reasoning",
      status: "online",
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      description: "Creative tasks",
      status: "busy",
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={clsx(
        "relative flex h-screen overflow-hidden",
        theme === "dark"
          ? "bg-slate-900 text-white"
          : "bg-gray-50 text-gray-900",
        className,
      )}
    >
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/3" />

      {/* Modern Sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "overflow-hidden border-r backdrop-blur-xl",
              theme === "dark"
                ? "border-slate-800 bg-slate-900/90"
                : "border-gray-200 bg-white/90",
            )}
          >
            <div className="flex h-full flex-col p-6">
              {/* Modern Logo */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-700">
                    <span className="text-sm font-bold text-white">G</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">GlassChat</h2>
                    <p className="text-xs text-gray-400">Enterprise AI</p>
                  </div>
                </div>
              </div>

              {/* Recent Conversations */}
              <div className="flex-1">
                <h3 className="mb-4 text-xs font-medium tracking-wider text-gray-400 uppercase">
                  Recent
                </h3>
                <div className="space-y-1">
                  {[
                    "Product Strategy Discussion",
                    "API Integration Help",
                    "Code Review Session",
                  ].map((conv, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                      className={clsx(
                        "w-full rounded-xl p-3 text-left text-sm transition-all duration-200",
                        "hover:backdrop-blur-sm",
                        theme === "dark"
                          ? "text-gray-300 hover:bg-slate-800/60 hover:text-white"
                          : "text-gray-600 hover:bg-gray-100/60 hover:text-gray-900",
                      )}
                    >
                      <div className="truncate font-medium">{conv}</div>
                      <div className="mt-1 text-xs text-gray-400">
                        2 hours ago
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="mt-8 border-t border-gray-800 pt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm",
                    "transition-all duration-200 hover:backdrop-blur-sm",
                    theme === "dark"
                      ? "text-gray-300 hover:bg-slate-800/60"
                      : "text-gray-600 hover:bg-gray-100/60",
                  )}
                >
                  <span className="text-lg">
                    {theme === "dark" ? "☀️" : "🌙"}
                  </span>
                  <span>Switch Theme</span>
                </motion.button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col">
        {/* Minimal Header */}
        <header
          className={clsx(
            "flex h-14 items-center justify-between px-6 backdrop-blur-xl",
            theme === "dark" ? "bg-slate-900/80" : "bg-white/80",
          )}
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={clsx(
                "rounded-lg p-2 transition-colors duration-200",
                theme === "dark"
                  ? "text-gray-400 hover:bg-slate-800/50"
                  : "text-gray-600 hover:bg-gray-100/50",
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

          <div className="flex items-center gap-3">
            {/* Model Selector in Header */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  "flex items-center gap-2 border backdrop-blur-xl",
                  theme === "dark"
                    ? "border-slate-700 bg-slate-800/60 text-gray-300 hover:bg-slate-800/80"
                    : "border-gray-300 bg-white/60 text-gray-700 hover:bg-white/80",
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {selectedModel}
                <svg
                  className={clsx(
                    "h-3 w-3 transition-transform duration-200",
                    modelDropdownOpen && "rotate-180",
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={clsx(
                      "absolute top-full right-0 mt-2",
                      "z-50 w-56 rounded-xl border shadow-xl backdrop-blur-xl",
                      theme === "dark"
                        ? "border-slate-700 bg-slate-800/90"
                        : "border-gray-200 bg-white/90",
                    )}
                  >
                    {models.map((model) => (
                      <motion.button
                        key={model.id}
                        whileHover={{ x: 4 }}
                        onClick={() => {
                          setSelectedModel(model.name);
                          setModelDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full p-3 text-left first:rounded-t-xl last:rounded-b-xl",
                          "flex items-center gap-3 transition-all duration-200",
                          theme === "dark"
                            ? "hover:bg-slate-700/50"
                            : "hover:bg-gray-50",
                        )}
                      >
                        <div
                          className={clsx(
                            "h-2 w-2 rounded-full",
                            model.status === "online"
                              ? "bg-green-400"
                              : "bg-orange-400",
                          )}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {model.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {model.description}
                          </div>
                        </div>
                        {selectedModel === model.name && (
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-green-400"
              />
              <span>Live</span>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-4"
                >
                  {/* Avatar */}
                  <div
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      message.isUser
                        ? "bg-purple-600 text-white"
                        : theme === "dark"
                          ? "bg-slate-700 text-gray-300"
                          : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {message.isUser ? "U" : "AI"}
                  </div>

                  {/* Message Content */}
                  <div className="max-w-none flex-1">
                    <div
                      className={clsx(
                        "rounded-2xl p-4 backdrop-blur-sm",
                        message.isUser
                          ? theme === "dark"
                            ? "border border-purple-500/30 bg-purple-600/20"
                            : "border border-purple-200 bg-purple-50"
                          : theme === "dark"
                            ? "border border-slate-700/50 bg-slate-800/40"
                            : "border border-gray-200 bg-white/60",
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className="mt-2 px-1 text-xs text-gray-400">
                      {currentTime || "Just now"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    theme === "dark"
                      ? "bg-slate-700 text-gray-300"
                      : "bg-gray-200 text-gray-600",
                  )}
                >
                  AI
                </div>
                <div
                  className={clsx(
                    "rounded-2xl p-4 backdrop-blur-sm",
                    theme === "dark"
                      ? "border border-slate-700/50 bg-slate-800/40"
                      : "border border-gray-200 bg-white/60",
                  )}
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="h-2 w-2 rounded-full bg-gray-400"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Modern Input Area */}
        <div className="p-6">
          <div className="mx-auto max-w-3xl">
            {/* Input with racing border */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                {/* Racing border effect */}
                {inputFocused && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                    style={{
                      padding: "2px",
                    }}
                  >
                    {/* Top border */}
                    <motion.div
                      className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                      style={{ width: "30%" }}
                      animate={{
                        x: ["-30%", "130%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0,
                      }}
                    />
                    {/* Right border */}
                    <motion.div
                      className="absolute top-0 right-0 w-0.5 bg-gradient-to-b from-transparent via-purple-500 to-transparent"
                      style={{ height: "30%" }}
                      animate={{
                        y: ["-30%", "130%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 0.5,
                      }}
                    />
                    {/* Bottom border */}
                    <motion.div
                      className="absolute right-0 bottom-0 h-0.5 bg-gradient-to-l from-transparent via-purple-500 to-transparent"
                      style={{ width: "30%" }}
                      animate={{
                        x: ["30%", "-130%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 1,
                      }}
                    />
                    {/* Left border */}
                    <motion.div
                      className="absolute bottom-0 left-0 w-0.5 bg-gradient-to-t from-transparent via-purple-500 to-transparent"
                      style={{ height: "30%" }}
                      animate={{
                        y: ["30%", "-130%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: 1.5,
                      }}
                    />
                  </motion.div>
                )}

                {/* Input container */}
                <div
                  className={clsx(
                    "relative rounded-2xl border backdrop-blur-xl transition-all duration-200",
                    inputFocused
                      ? "border-transparent shadow-lg shadow-purple-500/20"
                      : theme === "dark"
                        ? "border-slate-700 hover:border-slate-600"
                        : "border-gray-300 hover:border-gray-400",
                    theme === "dark" ? "bg-slate-800/60" : "bg-white/60",
                  )}
                >
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Message GlassChat..."
                    className={clsx(
                      "w-full resize-none border-none bg-transparent p-4 pr-14 outline-none",
                      "text-sm leading-relaxed placeholder-gray-400",
                      "max-h-32 min-h-[56px]",
                    )}
                    rows={1}
                  />

                  {/* Send Button */}
                  <motion.button
                    type="submit"
                    disabled={!inputValue.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={clsx(
                      "absolute top-1/2 right-2 -translate-y-1/2 transform",
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      "transition-all duration-200",
                      inputValue.trim()
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-700"
                        : theme === "dark"
                          ? "bg-slate-700 text-gray-400"
                          : "bg-gray-200 text-gray-400",
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
