"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatGPTInterfaceProps {
  className?: string;
}

const CONVERSATIONS = [
  { id: "1", title: "React best practices", timestamp: "Today" },
  { id: "2", title: "TypeScript error handling", timestamp: "Today" },
  { id: "3", title: "Database optimization tips", timestamp: "Yesterday" },
  { id: "4", title: "API design patterns", timestamp: "Yesterday" },
  { id: "5", title: "CSS Grid vs Flexbox", timestamp: "2 days ago" },
  { id: "6", title: "Node.js performance", timestamp: "2 days ago" },
];

export function ChatGPTInterface({ className }: ChatGPTInterfaceProps) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState("GPT-4");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateResponse(inputValue),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (input: string): string => {
    return `I understand you're asking about "${input}". Here's a comprehensive response that addresses your question with practical insights and actionable recommendations.

This is a simulated response to demonstrate the ChatGPT-style interface. In a real implementation, this would connect to your AI service.

Key points to consider:
• First important aspect
• Second key consideration  
• Third relevant factor

Would you like me to elaborate on any of these points?`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <div
      className={clsx(
        "flex h-screen",
        theme === "dark" ? "bg-gray-800" : "bg-white",
        className,
      )}
    >
      {/* Sidebar */}
      <div
        className={clsx(
          "border-r transition-all duration-200",
          theme === "dark"
            ? "border-gray-700 bg-gray-900"
            : "border-gray-200 bg-gray-50",
          sidebarOpen ? "w-64" : "w-0",
        )}
      >
        {sidebarOpen && (
          <div className="flex h-full flex-col">
            {/* New Chat Button */}
            <div className="p-3">
              <button
                className={clsx(
                  "w-full rounded-lg border p-3 text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100",
                )}
              >
                + New chat
              </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {CONVERSATIONS.map((conv) => (
                  <button
                    key={conv.id}
                    className={clsx(
                      "w-full rounded-lg p-3 text-left text-sm transition-colors",
                      "text-gray-300 hover:bg-gray-700",
                    )}
                  >
                    <div className="truncate font-medium">{conv.title}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {conv.timestamp}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Menu */}
            <div className="border-t border-gray-700 p-3">
              <button
                onClick={toggleTheme}
                className={clsx(
                  "w-full rounded p-2 text-left text-sm transition-colors",
                  "text-gray-300 hover:bg-gray-700",
                )}
              >
                {theme === "dark" ? "☀️" : "🌙"}{" "}
                {theme === "dark" ? "Light" : "Dark"} mode
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header
          className={clsx(
            "flex h-14 items-center justify-between border-b px-4",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={clsx(
                "rounded p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700",
                theme === "dark" ? "text-gray-300" : "text-gray-600",
              )}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12h18M3 6h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              className={clsx(
                "text-lg font-semibold",
                theme === "dark" ? "text-white" : "text-gray-900",
              )}
            >
              {selectedModel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={clsx(
                "rounded border px-3 py-1 text-sm",
                theme === "dark"
                  ? "border-gray-600 bg-gray-700 text-gray-300"
                  : "border-gray-300 bg-white text-gray-700",
              )}
            >
              <option value="GPT-4">GPT-4</option>
              <option value="GPT-3.5">GPT-3.5</option>
              <option value="Claude-3">Claude-3</option>
            </select>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="mx-auto max-w-md p-6 text-center">
                <h2
                  className={clsx(
                    "mb-4 text-2xl font-semibold",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  How can I help you today?
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    "Explain quantum computing",
                    "Write a Python function",
                    "Plan a marketing strategy",
                    "Debug this code error",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className={clsx(
                        "rounded-lg border p-3 text-left text-sm transition-colors",
                        theme === "dark"
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                        message.isUser
                          ? "bg-blue-600 text-white"
                          : theme === "dark"
                            ? "bg-green-600 text-white"
                            : "bg-green-600 text-white",
                      )}
                    >
                      {message.isUser ? "U" : "AI"}
                    </div>

                    {/* Message */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={clsx(
                          "prose max-w-none",
                          theme === "dark" ? "prose-invert" : "prose-gray",
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-medium text-white">
                      AI
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-gray-400">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400"></div>
                        <div
                          className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className={clsx(
            "border-t p-4",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ChatGPT..."
                className={clsx(
                  "w-full resize-none rounded-xl border p-4 pr-12 transition-colors",
                  "focus:ring-2 focus:ring-blue-500 focus:outline-none",
                  theme === "dark"
                    ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                    : "border-gray-300 bg-white text-gray-900 placeholder-gray-500",
                )}
                rows={1}
                style={{ maxHeight: "200px" }}
              />

              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={clsx(
                  "absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  inputValue.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-400",
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
              </button>
            </form>

            <p className="mt-2 text-center text-xs text-gray-500">
              ChatGPT can make mistakes. Consider checking important
              information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
