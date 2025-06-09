"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Copy,
  Sparkles,
  Languages,
  Search,
  ArrowUp,
  Plus,
  Sidebar,
  MoreHorizontal,
  Check,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: "sending" | "sent";
}

interface ChatInterfaceProps {
  className?: string;
}

const CONVERSATION_HISTORY = [
  { id: "1", title: "Real-time transcription setup", time: "5m ago" },
  { id: "2", title: "Voice AI model comparison", time: "2h ago" },
  { id: "3", title: "Audio processing cost optimization", time: "1d ago" },
  { id: "4", title: "API integration for Node.js", time: "3d ago" },
  { id: "5", title: "Speech-to-Text Performance", time: "1 week ago" },
];

// Professional easing curve for all animations
const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

// --- TextSelectionMenu Component Definition ---
interface TextSelectionMenuProps {
  position: { top: number; left: number };
  onCopy: () => void;
  onExplain: () => void;
  onTranslate: () => void;
}

const TextSelectionMenu = ({
  position,
  onCopy,
  onExplain,
  onTranslate,
}: TextSelectionMenuProps) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 5 }}
      transition={{ duration: 0.15, ease: DYNAMIC_EASE }}
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/80 p-1 shadow-2xl backdrop-blur-sm"
      style={{ top: position.top, left: position.left }}
      onMouseUp={(e) => e.stopPropagation()} // Prevents menu from disappearing when clicking it
    >
      <button
        onClick={handleCopy}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Copy"
      >
        {copied ? (
          <Check size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} />
        )}
      </button>
      <div className="h-4 w-[1px] bg-slate-700/50" />
      <button
        onClick={onExplain}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Explain"
      >
        <Sparkles size={14} />
      </button>
      <button
        onClick={onTranslate}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Translate"
      >
        <Languages size={14} />
      </button>
    </motion.div>
  );
};
// -----------------------------------------

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("GPT-4 Turbo");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMenu, setSelectionMenu] = useState<{
    position: { top: number; left: number };
    text: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      // Don't show menu if clicking inside the menu itself
      const selectionMenuElement = (event.target as HTMLElement).closest(
        "[data-selection-menu]",
      );
      if (selectionMenuElement) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selection && selectedText) {
        const range = selection.getRangeAt(0);

        let parent: Node | null = range.commonAncestorContainer;
        while (
          parent &&
          !(parent instanceof HTMLElement && parent.dataset.messageContent)
        ) {
          parent = parent.parentNode;
        }

        if (parent) {
          const rect = range.getBoundingClientRect();
          setSelectionMenu({
            position: {
              top: rect.top - 55 + window.scrollY,
              left: rect.left + rect.width / 2 - 68 + window.scrollX,
            },
            text: selectedText,
          });
        } else {
          setSelectionMenu(null);
        }
      } else {
        setSelectionMenu(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Update status to sent
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "sent" } : msg,
        ),
      );
    }, 800);

    // Simulate AI response with typing animation
    setTimeout(() => {
      const responses = [
        "I understand you're asking about that. Let me break this down for you.",
        "That's a great question! Here's what I think about it...",
        "Based on my understanding, here are the key points to consider:",
        "Let me help you with that. From my perspective...",
        "Interesting question! I'd be happy to explain this concept.",
      ];

      const generateResponse = () => {
        // Use default responses for now
        return (
          responses[Math.floor(Math.random() * responses.length)] ??
          "Thanks for your message!"
        );
      };

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      const fullResponse = generateResponse();
      const words = fullResponse.split(" ");

      const streamWords = (index: number) => {
        if (index < words.length) {
          const partialContent = words.slice(0, index + 1).join(" ");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessage.id
                ? { ...msg, content: partialContent }
                : msg,
            ),
          );
          setTimeout(() => streamWords(index + 1), 35);
        } else {
          setIsTyping(false);
        }
      };

      streamWords(0);
    }, 1200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleCopy = () => {
    if (selectionMenu?.text) {
      void navigator.clipboard.writeText(selectionMenu.text);
    }
  };

  const handleExplain = () => {
    if (selectionMenu?.text) {
      setInputValue(`Can you explain: "${selectionMenu.text}"`);
      setSelectionMenu(null);
      textareaRef.current?.focus();
    }
  };

  const handleTranslate = () => {
    if (selectionMenu?.text) {
      setInputValue(`Please translate: "${selectionMenu.text}"`);
      setSelectionMenu(null);
      textareaRef.current?.focus();
    }
  };

  const filteredHistory = CONVERSATION_HISTORY.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const suggestions = [
    "How does real-time voice AI work?",
    "Compare different speech models",
    "Optimize API call costs",
    "Best practices for audio quality",
  ];

  return (
    <div
      className={clsx(
        "flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
        className,
      )}
    >
      {/* Text Selection Menu */}
      <AnimatePresence>
        {selectionMenu && (
          <TextSelectionMenu
            position={selectionMenu.position}
            onCopy={handleCopy}
            onExplain={handleExplain}
            onTranslate={handleTranslate}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
            className="flex-shrink-0 border-r border-slate-700/50"
          >
            <div className="flex h-full flex-col bg-slate-900/50 backdrop-blur-xl">
              {/* Sidebar Header */}
              <div className="border-b border-slate-700/50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-1.5">
                      <div className="h-full w-full rounded-md bg-white/20"></div>
                    </div>
                    <span className="font-semibold text-white">GlassChat</span>
                  </div>
                  <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                    <Plus size={18} />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pr-4 pl-10 text-sm text-white placeholder-slate-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                  />
                </div>
              </div>

              {/* Conversation History */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {filteredHistory.map((chat, index) => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.2,
                        ease: DYNAMIC_EASE,
                      }}
                      className="group cursor-pointer rounded-lg p-3 transition-colors hover:bg-slate-800/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium text-white">
                            {chat.title}
                          </h4>
                          <p className="text-xs text-slate-400">{chat.time}</p>
                        </div>
                        <button className="ml-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <MoreHorizontal
                            size={14}
                            className="text-slate-400"
                          />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* User Profile */}
              <div className="border-t border-slate-700/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500"></div>
                    <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-400"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      Chat User
                    </p>
                    <p className="text-xs text-slate-400">Online</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <Sidebar size={18} />
              </button>
              <div>
                <h1 className="font-semibold text-white">Voice AI Assistant</h1>
                <p className="text-sm text-slate-400">
                  Powered by advanced language models
                </p>
              </div>
            </div>

            {/* Model Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-700/50"
              >
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                {selectedModel}
              </button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15, ease: DYNAMIC_EASE }}
                    className="absolute top-full right-0 z-10 mt-2 w-48 rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-xl"
                  >
                    {["GPT-4 Turbo", "Claude 3", "Gemini Pro"].map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setModelDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700/50"
                      >
                        <div className="h-2 w-2 rounded-full bg-green-400"></div>
                        {model}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: DYNAMIC_EASE }}
                className="text-center"
              >
                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4">
                  <Sparkles className="h-full w-full text-white" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-white">
                  Welcome to Voice AI Chat
                </h2>
                <p className="mb-8 text-slate-400">
                  Start a conversation or choose from these suggestions
                </p>

                {/* Suggestion Chips */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.3,
                        ease: DYNAMIC_EASE,
                      }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-left text-sm text-slate-300 transition-all hover:border-blue-500/50 hover:bg-slate-800/50 hover:text-white"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.3,
                  ease: DYNAMIC_EASE,
                }}
                className={clsx(
                  "flex gap-4",
                  message.isUser ? "justify-end" : "justify-start",
                )}
              >
                {!message.isUser && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-2 text-white">
                    <Sparkles className="h-full w-full" />
                  </div>
                )}

                <div
                  className={clsx(
                    "max-w-[70%] rounded-2xl px-4 py-3",
                    message.isUser
                      ? "bg-blue-600 text-white"
                      : "border border-slate-700/50 bg-slate-800/30 text-slate-100",
                  )}
                >
                  <div
                    data-message-content
                    className="prose prose-invert prose-p:my-1 prose-code:rounded prose-code:bg-slate-700/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-slate-200 max-w-none"
                  >
                    {message.content}
                  </div>

                  {message.isUser && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {message.status === "sending" && (
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 animate-pulse rounded-full bg-blue-200"></div>
                            <div
                              className="h-1 w-1 animate-pulse rounded-full bg-blue-200"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="h-1 w-1 animate-pulse rounded-full bg-blue-200"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        )}
                        {message.status === "sent" && (
                          <Check size={12} className="text-blue-200" />
                        )}
                      </div>
                      <div className="ml-auto">
                        <div className="flex items-center justify-end gap-2 pt-1 pl-1 text-xs text-slate-600">
                          <span>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!message.isUser && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center justify-end gap-2 pt-1 pl-1 text-xs text-slate-600">
                        <span>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {message.isUser && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500"></div>
                )}
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-2 text-white">
                  <Sparkles className="h-full w-full" />
                </div>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 bg-slate-900/50 p-4 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/30">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full resize-none border-0 bg-transparent px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none"
                  rows={1}
                  style={{ minHeight: "48px", maxHeight: "200px" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className={clsx(
                    "absolute right-2 bottom-2 rounded-xl p-2 transition-all",
                    inputValue.trim() && !isTyping
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-700/50 text-slate-400",
                  )}
                >
                  {isTyping ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </div>

              {/* Character counter and hints */}
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="opacity-75">
                  Press Shift+Enter for new line
                </span>
                <span
                  className={clsx(
                    inputValue.length > 1800 && "text-yellow-400",
                    inputValue.length > 1950 && "text-red-400",
                  )}
                >
                  {inputValue.length}/2000
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
