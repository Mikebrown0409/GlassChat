"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";

interface DeepgramLayoutProps {
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

export function DeepgramInspiredLayout({
  messages,
  onSendMessage,
  isTyping = false,
  className,
}: DeepgramLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    // Set time only on client side to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString());
  }, []);

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
    <div
      className={clsx(
        "relative flex h-screen",
        theme === "dark"
          ? "bg-slate-900 text-white"
          : "bg-gray-50 text-gray-900",
        className,
      )}
    >
      {/* Subtle background overlay */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-purple-900/3 to-transparent" />

      {/* Sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={clsx(
              "overflow-hidden border-r backdrop-blur-sm",
              theme === "dark"
                ? "border-slate-700 bg-slate-800/95"
                : "border-gray-200 bg-white/95",
            )}
          >
            <div className="p-6">
              {/* Logo/Brand */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold">
                  Glass<span className="text-purple-400">Chat</span>
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Enterprise Voice AI
                </p>
              </div>

              {/* Model Selection */}
              <div className="mb-8">
                <h3 className="mb-3 text-sm font-medium tracking-wide text-gray-400 uppercase">
                  Models
                </h3>
                <div className="space-y-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.name)}
                      className={clsx(
                        "w-full rounded-lg p-3 text-left transition-all duration-150",
                        "flex items-center gap-3",
                        selectedModel === model.name
                          ? theme === "dark"
                            ? "border border-purple-700/50 bg-purple-800/30 text-purple-200"
                            : "border border-purple-300 bg-purple-50 text-purple-800"
                          : theme === "dark"
                            ? "text-gray-300 hover:bg-slate-700"
                            : "text-gray-600 hover:bg-gray-50",
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
                      <span className="text-sm font-medium">{model.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* History */}
              <div className="mb-8">
                <h3 className="mb-3 text-sm font-medium tracking-wide text-gray-400 uppercase">
                  Recent Conversations
                </h3>
                <div className="space-y-1">
                  {[
                    "Product Strategy Discussion",
                    "API Integration Help",
                    "Code Review Session",
                  ].map((conv, i) => (
                    <button
                      key={i}
                      className={clsx(
                        "w-full rounded p-2 text-left text-sm transition-colors duration-150",
                        theme === "dark"
                          ? "text-gray-400 hover:bg-slate-700 hover:text-gray-300"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-600",
                      )}
                    >
                      {conv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="mb-3 text-sm font-medium tracking-wide text-gray-400 uppercase">
                  Settings
                </h3>
                <button
                  onClick={toggleTheme}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded p-2 text-left text-sm",
                    "transition-colors duration-150",
                    theme === "dark"
                      ? "text-gray-400 hover:bg-slate-700 hover:text-gray-300"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-600",
                  )}
                >
                  {theme === "dark" ? "☀️" : "🌙"}
                  <span>
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                  </span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header
          className={clsx(
            "flex h-16 items-center justify-between border-b px-6",
            theme === "dark" ? "border-slate-700" : "border-gray-200",
          )}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={clsx(
                "rounded-lg p-2 transition-colors duration-150",
                theme === "dark"
                  ? "text-gray-400 hover:bg-slate-800 hover:text-gray-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-600",
              )}
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
            </button>

            <div>
              <h1 className="font-semibold">Chat with {selectedModel}</h1>
              <p className="text-sm text-gray-400">GlassChat Enterprise</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span>Connected</span>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-700/30 bg-purple-800/20 backdrop-blur-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-purple-400"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium">
                  Welcome to GlassChat
                </h3>
                <p className="mx-auto max-w-md text-gray-400">
                  Start a conversation with our enterprise AI assistant. Ask
                  questions, get insights, or explore our voice AI capabilities.
                </p>
              </div>
            )}

            {/* Messages */}
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={clsx(
                    "flex gap-4",
                    message.isUser ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={clsx(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                      message.isUser
                        ? "bg-purple-800 text-white"
                        : theme === "dark"
                          ? "bg-slate-700 text-gray-300"
                          : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {message.isUser ? "U" : "AI"}
                  </div>

                  {/* Message Content */}
                  <div
                    className={clsx(
                      "max-w-[70%] flex-1",
                      message.isUser ? "text-right" : "text-left",
                    )}
                  >
                    <div
                      className={clsx(
                        "inline-block rounded-lg p-4",
                        message.isUser
                          ? "bg-purple-800 text-white backdrop-blur-sm"
                          : theme === "dark"
                            ? "border border-slate-700/50 bg-slate-800/90 backdrop-blur-sm"
                            : "border border-gray-200/50 bg-white/90 backdrop-blur-sm",
                      )}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <p className="mt-1 px-1 text-xs text-gray-400">
                      {currentTime || "Just now"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex gap-4"
                >
                  <div
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      theme === "dark"
                        ? "bg-slate-700 text-gray-300"
                        : "bg-gray-200 text-gray-600",
                    )}
                  >
                    AI
                  </div>
                  <div
                    className={clsx(
                      "rounded-lg p-4 backdrop-blur-sm",
                      theme === "dark"
                        ? "border border-slate-700/50 bg-slate-800/90"
                        : "border border-gray-200/50 bg-white/90",
                    )}
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-2 w-2 rounded-full bg-gray-400"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area */}
        <div
          className={clsx(
            "border-t p-6",
            theme === "dark" ? "border-slate-700" : "border-gray-200",
          )}
        >
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
            <div className="flex gap-4">
              {/* Input with subtle focus effects */}
              <div className="relative flex-1">
                <div
                  className={clsx(
                    "relative rounded-lg border backdrop-blur-sm transition-all duration-150",
                    "focus-within:border-purple-700 focus-within:ring-2 focus-within:ring-purple-700/30",
                    theme === "dark"
                      ? "border-slate-600/50 bg-slate-800/80"
                      : "border-gray-300/50 bg-white/80",
                  )}
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className={clsx(
                      "w-full resize-none border-none bg-transparent p-4 outline-none",
                      theme === "dark"
                        ? "text-white placeholder-gray-400"
                        : "text-gray-900 placeholder-gray-500",
                    )}
                  />
                </div>
              </div>

              {/* Send button */}
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={clsx(
                  "rounded-lg px-6 py-4 font-medium transition-all duration-200",
                  inputValue.trim()
                    ? "bg-purple-800 text-white shadow-lg hover:bg-purple-900 hover:shadow-purple-800/20"
                    : "cursor-not-allowed bg-gray-600 text-gray-300",
                  "focus:ring-2 focus:ring-purple-700/30 focus:outline-none",
                )}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
