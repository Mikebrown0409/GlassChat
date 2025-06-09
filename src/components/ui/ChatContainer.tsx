"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  avatar?: string;
}

interface ChatContainerProps {
  className?: string;
}

// Avatar options for AI personalization
interface AIAvatar {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const AI_AVATARS: AIAvatar[] = [
  {
    id: "sage",
    name: "Sage",
    emoji: "🧙‍♂️",
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "nova",
    name: "Nova",
    emoji: "⭐",
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "iris",
    name: "Iris",
    emoji: "👁️",
    color: "from-blue-400 to-indigo-500",
  },
  { id: "echo", name: "Echo", emoji: "🌊", color: "from-cyan-400 to-blue-500" },
] as const;

const QUICK_REPLIES = [
  "Explain this concept",
  "Generate code example",
  "Help me brainstorm",
  "What's the best approach?",
];

export function ChatContainer({ className }: ChatContainerProps) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm here to help you with anything you need. What would you like to explore today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiPersona, setAiPersona] = useState<AIAvatar>(() => {
    const defaultAvatar = AI_AVATARS[0];
    if (!defaultAvatar)
      throw new Error("AI_AVATARS must have at least one avatar");
    return defaultAvatar;
  });
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [backgroundShift, setBackgroundShift] = useState(0);
  const [activeQuickReply, setActiveQuickReply] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Dynamic background shift on typing
  useEffect(() => {
    if (isTyping) {
      setBackgroundShift(15);
    } else {
      setBackgroundShift(0);
    }
  }, [isTyping]);

  const handleSubmit = (messageText: string = inputValue) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(
      () => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: generateResponse(messageText),
          isUser: false,
          timestamp: new Date(),
          avatar: aiPersona.emoji,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      },
      1500 + Math.random() * 1000,
    );
  };

  const generateResponse = (input: string): string => {
    const responses = [
      `That's an interesting perspective on "${input}". Let me help you explore this further...`,
      `Great question about "${input}"! Here's what I think could help...`,
      `I understand you're asking about "${input}". Based on current best practices...`,
      `Thanks for bringing up "${input}". This reminds me of similar challenges where...`,
    ];
    const randomIndex = Math.floor(Math.random() * responses.length);
    const selectedResponse = responses[randomIndex];
    return selectedResponse ?? responses[0] ?? "Thanks for your message!";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={clsx(
        "relative flex h-screen flex-col overflow-hidden",
        className,
      )}
    >
      {/* Dynamic Background */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background:
            theme === "dark"
              ? `linear-gradient(${135 + backgroundShift}deg, 
                #0f172a 0%, 
                #1e293b 25%,
                #334155 50%,
                #1e293b 75%,
                #0f172a 100%)`
              : `linear-gradient(${135 + backgroundShift}deg,
                #f8fafc 0%,
                #e2e8f0 25%,
                #cbd5e1 50%,
                #e2e8f0 75%,
                #f8fafc 100%)`,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />

      {/* Floating Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className={clsx(
              "absolute h-2 w-2 rounded-full opacity-20",
              theme === "dark" ? "bg-purple-400" : "bg-emerald-400",
            )}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 p-6 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
                  aiPersona.color,
                )}
              >
                {aiPersona.emoji}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Chat with {aiPersona.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  GlassChat Enterprise • Always learning
                </p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPersonalization(!showPersonalization)}
            className={clsx(
              "rounded-xl px-4 py-2 font-medium transition-all duration-200",
              "bg-gradient-to-r from-orange-400 to-red-500 text-white",
              "shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40",
            )}
          >
            Customize AI
          </motion.button>
        </div>

        {/* Personalization Panel */}
        <AnimatePresence>
          {showPersonalization && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto mt-4 max-w-4xl rounded-xl bg-white/80 p-4 backdrop-blur-sm dark:bg-slate-800/80"
            >
              <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Choose your AI assistant
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {AI_AVATARS.map((avatar) => (
                  <motion.button
                    key={avatar.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setAiPersona(avatar);
                      setShowPersonalization(false);
                    }}
                    className={clsx(
                      "rounded-xl p-3 text-center transition-all duration-200",
                      aiPersona.id === avatar.id
                        ? "bg-gradient-to-br " +
                            avatar.color +
                            " text-white shadow-lg"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600",
                    )}
                  >
                    <div className="mb-1 text-2xl">{avatar.emoji}</div>
                    <div className="text-sm font-medium">{avatar.name}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Messages Area */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  "flex gap-4",
                  message.isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <div
                  className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
                    message.isUser
                      ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                      : `bg-gradient-to-br ${aiPersona.color} text-white`,
                  )}
                >
                  {message.isUser ? "👤" : (message.avatar ?? aiPersona.emoji)}
                </div>

                {/* Message Content */}
                <div
                  className={clsx(
                    "max-w-[70%] flex-1",
                    message.isUser ? "items-end" : "items-start",
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={clsx(
                      "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
                      message.isUser
                        ? theme === "dark"
                          ? "border-green-500/30 bg-green-600/20 text-green-100"
                          : "border-green-200 bg-green-50 text-green-900"
                        : theme === "dark"
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-gray-200 bg-white/80 text-gray-900",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </motion.div>

                  <div
                    className={clsx(
                      "mt-2 px-2 text-xs text-gray-400",
                      message.isUser ? "text-right" : "text-left",
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </div>
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
                  "flex h-10 w-10 items-center justify-center rounded-xl text-lg",
                  `bg-gradient-to-br ${aiPersona.color} text-white`,
                )}
              >
                {aiPersona.emoji}
              </div>
              <div className="flex-1">
                <div
                  className={clsx(
                    "inline-block rounded-2xl border p-4 backdrop-blur-sm",
                    theme === "dark"
                      ? "border-white/20 bg-white/10"
                      : "border-gray-200 bg-white/80",
                  )}
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-2 w-2 rounded-full bg-gray-400"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Replies */}
      {messages.length <= 1 && (
        <div className="relative z-10 px-6 py-2">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_REPLIES.map((reply) => (
                <motion.button
                  key={reply}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSubmit(reply)}
                  onMouseEnter={() => setActiveQuickReply(reply)}
                  onMouseLeave={() => setActiveQuickReply(null)}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm transition-all duration-200",
                    "border backdrop-blur-sm",
                    activeQuickReply === reply
                      ? "border-transparent bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg"
                      : theme === "dark"
                        ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                        : "border-gray-200 bg-white/80 text-gray-700 hover:bg-white",
                  )}
                >
                  {reply}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="relative z-10 p-6">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative"
          >
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                placeholder="Type your message..."
                className={clsx(
                  "w-full resize-none rounded-2xl p-4 pr-16 transition-all duration-200",
                  "bg-white/90 backdrop-blur-sm dark:bg-slate-800/90",
                  "border-2 border-gray-200 dark:border-slate-600",
                  "focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20",
                  "text-gray-900 placeholder-gray-400 dark:text-white",
                  "max-h-32 min-h-[56px] outline-none",
                )}
                rows={1}
              />

              <motion.button
                type="submit"
                disabled={!inputValue.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={clsx(
                  "absolute top-1/2 right-2 -translate-y-1/2 transform",
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  "transition-all duration-200",
                  inputValue.trim()
                    ? "bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-gray-200 text-gray-400 dark:bg-slate-600",
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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

            {/* Input Footer */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>Press Enter to send, Shift + Enter for new line</span>
              <span>Powered by {aiPersona.name}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
