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
}

interface DeepgramStyleChatUIProps {
  className?: string;
}

const CONVERSATION_HISTORY = [
  { id: '1', title: 'Voice AI Implementation', time: '2 hours ago' },
  { id: '2', title: 'API Rate Optimization', time: '1 day ago' },
  { id: '3', title: 'Real-time Transcription Setup', time: '2 days ago' },
  { id: '4', title: 'Audio Intelligence Integration', time: '3 days ago' },
  { id: '5', title: 'Speech-to-Text Performance', time: '1 week ago' },
];

export function DeepgramStyleChatUI({
  className: _className,
}: DeepgramStyleChatUIProps) {
  const { theme: _theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedModel, setSelectedModel] = useState("GPT-4 Turbo");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about "${inputValue}". Here's how we can help you implement this with our Voice AI platform. Our APIs provide unmatched accuracy and speed for enterprise use cases.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const models = [
    { id: "gpt-4", name: "GPT-4 Turbo", description: "Most capable model" },
    { id: "gpt-3.5", name: "GPT-3.5 Turbo", description: "Fast and efficient" },
    { id: "claude-3", name: "Claude 3", description: "Great for analysis" },
  ];

  return (
    <div className="h-screen w-screen flex bg-black text-slate-200 font-sans overflow-hidden fixed inset-0">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, x: -300 }}
            animate={{ width: 300, x: 0 }}
            exit={{ width: 0, x: -300 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-[#080808] border-r border-slate-900 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center">
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
                  <h1 className="text-base font-semibold text-white">GlassChat</h1>
                  <p className="text-sm text-slate-500">AI Platform</p>
                </div>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button className="w-full flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-md font-medium transition-colors duration-200 text-sm text-slate-300 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
                New Conversation
              </button>
            </div>

            {/* Conversation History */}
            <div className="flex-1 px-3 pb-4 overflow-y-auto">
              <h3 className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2 px-2">
                History
              </h3>
              <div className="space-y-1">
                {CONVERSATION_HISTORY.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full p-2 text-left rounded-md hover:bg-slate-800/60 transition-colors duration-200 group"
                  >
                    <div className="text-sm font-normal text-slate-300 group-hover:text-white truncate">
                      {conv.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-900">
              <div className="text-xs text-slate-600">
                GlassChat Enterprise
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-900 flex items-center px-6 bg-black/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-md hover:bg-slate-800/60 transition-colors mr-4 text-slate-400 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-300">Voice AI Assistant</span>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 mb-4 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center">
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
              <h2 className="text-xl font-semibold text-white mb-1">
                How can I help you today?
              </h2>
              <p className="text-slate-500 max-w-sm mx-auto">
                Ask me anything about voice AI, speech-to-text, or audio intelligence implementation.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={clsx(
                      "flex gap-4",
                      message.isUser ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs",
                        message.isUser
                          ? "bg-slate-700 text-slate-300"
                          : "bg-slate-800 text-slate-400"
                      )}
                    >
                      {message.isUser ? "You" : "AI"}
                    </div>
                    <div className="space-y-2">
                      <div
                        className={clsx(
                          "max-w-prose p-4 rounded-lg border",
                          message.isUser
                            ? "bg-slate-800/50 border-slate-700/50 text-slate-200"
                            : "bg-black border-slate-900 text-slate-300"
                        )}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <div className="text-xs text-slate-600 pl-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                    AI
                  </div>
                  <div className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-2xl backdrop-blur-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-slate-400 rounded-full"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
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
        <div className="border-t border-slate-900 bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask anything..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 pr-28 text-sm resize-none outline-none focus:border-slate-600 transition-colors duration-200 placeholder-slate-500 text-slate-200 min-h-[50px] max-h-48"
                  rows={1}
                />
                <div className="absolute right-3 flex items-center gap-2">
                  <div ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/50 rounded-md"
                    >
                      <span>{selectedModel}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {modelDropdownOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setModelDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700/80 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedModel === model.name ? 'text-blue-400' : 'text-slate-200'
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
                    disabled={!inputValue.trim()}
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                      inputValue.trim()
                        ? "bg-slate-200 text-black"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M7 11L12 6L17 11M12 18V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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