"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Copy, Sparkles, Languages } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface DeepgramStyleChatUIProps {
  className?: string;
}

const CONVERSATION_HISTORY = [
  { id: "1", title: "Real-time transcription setup", time: "5m ago" },
  { id: "2", title: "Voice AI model comparison", time: "2h ago" },
  { id: "3", title: "Audio processing cost optimization", time: "1d ago" },
  { id: "4", title: "API integration for Node.js", time: "3d ago" },
  { id: "5", title: "Speech-to-Text Performance", time: "1 week ago" },
];

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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="absolute z-50 flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 p-1 shadow-2xl"
      style={{ top: position.top, left: position.left }}
      onMouseUp={(e) => e.stopPropagation()} // Prevents menu from disappearing when clicking it
    >
      <button
        onClick={onCopy}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Copy"
      >
        <Copy size={16} />
      </button>
      <div className="h-4 w-[1px] bg-slate-700" />
      <button
        onClick={onExplain}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Explain"
      >
        <Sparkles size={16} />
      </button>
      <button
        onClick={onTranslate}
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
        title="Translate"
      >
        <Languages size={16} />
      </button>
    </motion.div>
  );
};
// -----------------------------------------

export function DeepgramStyleChatUI({
  className: _className,
}: DeepgramStyleChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("GPT-4 Turbo");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
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
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: "", // Start with empty content
      isUser: false,
      timestamp: new Date(),
    };

    // Add the empty AI message to start
    setMessages((prev) => [...prev, aiResponse]);

    // The streaming effect will be handled by a useEffect
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isUser && lastMessage.content === "") {
      const fullResponse = `I understand you're asking about that. Here is a detailed explanation of how our APIs provide unmatched accuracy and speed for enterprise use cases. Let's break it down further.`;
      const words = fullResponse.split(" ");
      let currentContent = "";

      const streamWords = (index: number) => {
        if (index < words.length) {
          currentContent += (index > 0 ? " " : "") + words[index];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === lastMessage.id
                ? { ...msg, content: currentContent }
                : msg,
            ),
          );
          setTimeout(() => streamWords(index + 1), 50);
        } else {
          setIsTyping(false); // Stop typing indicator when streaming is complete
        }
      };

      setTimeout(() => streamWords(0), 500); // Initial delay before streaming starts
    }
  }, [messages]);

  const models = [
    { id: "gpt-4", name: "GPT-4 Turbo", description: "Most capable model" },
    { id: "gpt-3.5", name: "GPT-3.5 Turbo", description: "Fast and efficient" },
    { id: "claude-3", name: "Claude 3", description: "Great for analysis" },
  ];

  return (
    <div className="fixed inset-0 flex h-screen w-screen overflow-hidden bg-black font-sans text-slate-200">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, x: -300 }}
            animate={{ width: 300, x: 0 }}
            exit={{ width: 0, x: -300 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col border-r border-slate-900 bg-[#080808]"
          >
            {/* Header */}
            <div className="border-b border-slate-900 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-400"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">
                    GlassChat
                  </h1>
                  <p className="text-sm text-slate-500">AI Platform</p>
                </div>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 p-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-slate-700/80 hover:text-white">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                New Conversation
              </button>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <h3 className="mb-2 px-2 text-xs font-medium tracking-wider text-slate-600 uppercase">
                History
              </h3>
              <div className="space-y-1">
                {CONVERSATION_HISTORY.map((conv) => (
                  <button
                    key={conv.id}
                    className="group w-full rounded-md p-2 text-left transition-colors duration-200 hover:bg-slate-800/60"
                  >
                    <div className="truncate text-sm font-normal text-slate-300 group-hover:text-white">
                      {conv.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-900 p-4">
              <div className="text-xs text-slate-600">GlassChat Enterprise</div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        <AnimatePresence>
          {selectionMenu && (
            <TextSelectionMenu
              position={selectionMenu.position}
              onCopy={() => {
                void navigator.clipboard.writeText(selectionMenu.text);
                setSelectionMenu(null);
              }}
              onExplain={() => {
                setInputValue(`Explain: "${selectionMenu.text}"`);
                setSelectionMenu(null);
              }}
              onTranslate={() => {
                setInputValue(`Translate: "${selectionMenu.text}"`);
                setSelectionMenu(null);
              }}
            />
          )}
        </AnimatePresence>
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-900 bg-black/80 px-6 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-4 -ml-2 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
            <span className="text-sm text-slate-300">Voice AI Assistant</span>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-slate-500"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="mb-1 text-xl font-semibold text-white">
                How can I help you today?
              </h2>
              <p className="mx-auto mb-8 max-w-sm text-slate-500">
                Ask me anything about voice AI, speech-to-text, or audio
                intelligence implementation.
              </p>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  "How to get started with real-time transcription?",
                  "Explain your different voice AI models.",
                  "How to reduce audio processing costs?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="rounded-full border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-8 p-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={clsx(
                      "flex gap-4",
                      message.isUser ? "flex-row-reverse" : "",
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        message.isUser
                          ? "bg-slate-700 text-slate-300"
                          : "bg-slate-800 text-slate-400",
                      )}
                    >
                      {message.isUser ? "You" : "AI"}
                    </div>
                    <div className="space-y-2">
                      <div
                        className={clsx(
                          "max-w-prose rounded-lg border p-4",
                          message.isUser
                            ? "border-slate-700/50 bg-slate-800/50 text-slate-200"
                            : "border-slate-900 bg-black text-slate-300",
                        )}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          data-message-content="true"
                        >
                          {message.content}
                        </p>
                      </div>
                      <div className="pl-1 text-xs text-slate-600">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800">
                    <motion.div
                      className="h-1.5 w-1.5 rounded-full bg-slate-400"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                  <div className="rounded-lg border border-slate-900 bg-black p-4">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-slate-500"
                          animate={{ y: [0, -2, 0] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-900 bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={
                    isTyping ? "AI is responding..." : "Ask anything..."
                  }
                  className="max-h-48 min-h-[50px] w-full resize-none rounded-lg border border-slate-700 bg-slate-900/50 p-3 pr-28 text-sm text-slate-200 placeholder-slate-500 transition-colors duration-200 outline-none focus:border-slate-600 disabled:opacity-60"
                  rows={1}
                  disabled={isTyping}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <div ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-md bg-slate-800/50 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-slate-200"
                    >
                      <span>{selectedModel}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`transition-transform duration-200 ${modelDropdownOpen ? "rotate-180" : ""}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {modelDropdownOpen && (
                      <div className="absolute right-0 bottom-full z-50 mb-2 w-48 rounded-lg border border-slate-700 bg-slate-800 shadow-2xl">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700/80 ${
                              selectedModel === model.name
                                ? "text-blue-400"
                                : "text-slate-200"
                            }`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                      inputValue.trim() && !isTyping
                        ? "bg-slate-200 text-black"
                        : "cursor-not-allowed bg-slate-800 text-slate-500",
                    )}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M7 11L12 6L17 11M12 18V6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
