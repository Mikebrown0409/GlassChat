"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { clsx } from "clsx";

interface ModernGlassChatLayoutProps {
  messages: Array<{ id: string; content: string; isUser: boolean; isTyping?: boolean }>;
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const models = [
    { id: "gpt-4", name: "GPT-4", description: "Most capable", status: "online" },
    { id: "claude-3", name: "Claude 3", description: "Best reasoning", status: "online" },
    { id: "gemini-pro", name: "Gemini Pro", description: "Creative tasks", status: "busy" },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={clsx(
      "h-screen flex relative overflow-hidden",
      theme === 'dark' 
        ? "bg-slate-900 text-white" 
        : "bg-gray-50 text-gray-900",
      className
    )}>
      
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/3 pointer-events-none" />
      
      {/* Modern Sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "border-r overflow-hidden backdrop-blur-xl",
              theme === 'dark' 
                ? "bg-slate-900/90 border-slate-800" 
                : "bg-white/90 border-gray-200"
            )}
          >
            <div className="p-6 h-full flex flex-col">
              {/* Modern Logo */}
              <div className="mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">G</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">GlassChat</h2>
                    <p className="text-xs text-gray-400">Enterprise AI</p>
                  </div>
                </div>
              </div>

              {/* Recent Conversations */}
              <div className="flex-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Recent
                </h3>
                <div className="space-y-1">
                  {["Product Strategy Discussion", "API Integration Help", "Code Review Session"].map((conv, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                      className={clsx(
                        "w-full p-3 rounded-xl text-left text-sm transition-all duration-200",
                        "hover:backdrop-blur-sm",
                        theme === 'dark'
                          ? "hover:bg-slate-800/60 text-gray-300 hover:text-white"
                          : "hover:bg-gray-100/60 text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <div className="font-medium truncate">{conv}</div>
                      <div className="text-xs text-gray-400 mt-1">2 hours ago</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                  className={clsx(
                    "w-full p-3 rounded-xl text-left text-sm flex items-center gap-3",
                    "transition-all duration-200 hover:backdrop-blur-sm",
                    theme === 'dark'
                      ? "hover:bg-slate-800/60 text-gray-300"
                      : "hover:bg-gray-100/60 text-gray-600"
                  )}
                >
                  <span className="text-lg">{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>Switch Theme</span>
                </motion.button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Minimal Header */}
        <header className={clsx(
          "h-14 flex items-center justify-between px-6 backdrop-blur-xl",
          theme === 'dark' 
            ? "bg-slate-900/80" 
            : "bg-white/80"
        )}>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={clsx(
                "p-2 rounded-lg transition-colors duration-200",
                theme === 'dark'
                  ? "hover:bg-slate-800/50 text-gray-400"
                  : "hover:bg-gray-100/50 text-gray-600"
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d={sidebarCollapsed ? "M3 12h18M3 6h18M3 18h18" : "M21 6H3M15 12H3M17 18H3"}
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
                   "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                   "backdrop-blur-xl border flex items-center gap-2",
                   theme === 'dark'
                     ? "bg-slate-800/60 border-slate-700 text-gray-300 hover:bg-slate-800/80"
                     : "bg-white/60 border-gray-300 text-gray-700 hover:bg-white/80"
                 )}
               >
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                 {selectedModel}
                 <svg className={clsx(
                   "w-3 h-3 transition-transform duration-200",
                   modelDropdownOpen && "rotate-180"
                 )} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                       "absolute top-full mt-2 right-0",
                       "w-56 rounded-xl backdrop-blur-xl border shadow-xl z-50",
                       theme === 'dark'
                         ? "bg-slate-800/90 border-slate-700"
                         : "bg-white/90 border-gray-200"
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
                           "transition-all duration-200 flex items-center gap-3",
                           theme === 'dark'
                             ? "hover:bg-slate-700/50"
                             : "hover:bg-gray-50"
                         )}
                       >
                         <div className={clsx(
                           "w-2 h-2 rounded-full",
                           model.status === "online" ? "bg-green-400" : "bg-orange-400"
                         )} />
                         <div className="flex-1">
                           <div className="font-medium text-sm">{model.name}</div>
                           <div className="text-xs text-gray-400">{model.description}</div>
                         </div>
                         {selectedModel === model.name && (
                           <div className="w-2 h-2 bg-purple-500 rounded-full" />
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
                 className="w-2 h-2 bg-green-400 rounded-full"
               />
               <span>Live</span>
             </div>
           </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
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
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    message.isUser
                      ? "bg-purple-600 text-white"
                      : theme === 'dark'
                        ? "bg-slate-700 text-gray-300"
                        : "bg-gray-200 text-gray-600"
                  )}>
                    {message.isUser ? "U" : "AI"}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 max-w-none">
                    <div className={clsx(
                      "p-4 rounded-2xl backdrop-blur-sm",
                      message.isUser
                        ? theme === 'dark'
                          ? "bg-purple-600/20 border border-purple-500/30"
                          : "bg-purple-50 border border-purple-200"
                        : theme === 'dark'
                          ? "bg-slate-800/40 border border-slate-700/50"
                          : "bg-white/60 border border-gray-200"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 px-1">
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
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  theme === 'dark' ? "bg-slate-700 text-gray-300" : "bg-gray-200 text-gray-600"
                )}>
                  AI
                </div>
                <div className={clsx(
                  "p-4 rounded-2xl backdrop-blur-sm",
                  theme === 'dark'
                    ? "bg-slate-800/40 border border-slate-700/50"
                    : "bg-white/60 border border-gray-200"
                )}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
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
           <div className="max-w-3xl mx-auto">

                         {/* Input with racing border */}
             <form onSubmit={handleSubmit} className="relative">
               <div className="relative">
                 {/* Racing border effect */}
                 {inputFocused && (
                   <motion.div
                     className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                     style={{
                       padding: '2px',
                     }}
                   >
                     {/* Top border */}
                     <motion.div
                       className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                       style={{ width: '30%' }}
                       animate={{
                         x: ['-30%', '130%'],
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: 'linear',
                         delay: 0,
                       }}
                     />
                     {/* Right border */}
                     <motion.div
                       className="absolute top-0 right-0 w-0.5 bg-gradient-to-b from-transparent via-purple-500 to-transparent"
                       style={{ height: '30%' }}
                       animate={{
                         y: ['-30%', '130%'],
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: 'linear',
                         delay: 0.5,
                       }}
                     />
                     {/* Bottom border */}
                     <motion.div
                       className="absolute bottom-0 right-0 h-0.5 bg-gradient-to-l from-transparent via-purple-500 to-transparent"
                       style={{ width: '30%' }}
                       animate={{
                         x: ['30%', '-130%'],
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: 'linear',
                         delay: 1,
                       }}
                     />
                     {/* Left border */}
                     <motion.div
                       className="absolute bottom-0 left-0 w-0.5 bg-gradient-to-t from-transparent via-purple-500 to-transparent"
                       style={{ height: '30%' }}
                       animate={{
                         y: ['30%', '-130%'],
                       }}
                       transition={{
                         duration: 2,
                         repeat: Infinity,
                         ease: 'linear',
                         delay: 1.5,
                       }}
                     />
                   </motion.div>
                 )}

                {/* Input container */}
                <div className={clsx(
                  "relative backdrop-blur-xl rounded-2xl border transition-all duration-200",
                  inputFocused 
                    ? "border-transparent shadow-lg shadow-purple-500/20"
                    : theme === 'dark'
                      ? "border-slate-700 hover:border-slate-600"
                      : "border-gray-300 hover:border-gray-400",
                  theme === 'dark' ? "bg-slate-800/60" : "bg-white/60"
                )}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Message GlassChat..."
                    className={clsx(
                      "w-full p-4 pr-14 bg-transparent border-none outline-none resize-none",
                      "placeholder-gray-400 text-sm leading-relaxed",
                      "min-h-[56px] max-h-32"
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
                      "absolute right-2 top-1/2 transform -translate-y-1/2",
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      "transition-all duration-200",
                      inputValue.trim()
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30"
                        : theme === 'dark'
                          ? "bg-slate-700 text-gray-400"
                          : "bg-gray-200 text-gray-400"
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