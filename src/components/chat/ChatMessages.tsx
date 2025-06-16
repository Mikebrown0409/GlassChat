"use client";

import BeamLoader from "@/components/ui/BeamLoader";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { type RefObject, useEffect, useRef, useState } from "react";
import { MessageDisplay } from "./MessageDisplay";

// Define ChatMessage type directly to avoid heavy imports if above fails
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  isPending: boolean;
  onTranslate: (text?: string) => void;
  onExplain: (text?: string) => void;
  onSuggestionClick: (text: string) => void;
  onUpdateMessage: (id: string, newContent: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

// Professional easing curve for all animations (keep in sync)
const DYNAMIC_EASE = [0.22, 1, 0.36, 1];

export function ChatMessages({
  messages,
  isTyping,
  isPending,
  onTranslate,
  onExplain,
  onSuggestionClick,
  onUpdateMessage,
  messagesEndRef,
}: ChatMessagesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

  // Detect scroll position
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200; // px
      setShowJump(!atBottom);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={viewportRef}
      className="chat-viewport glass-scrollbar relative pb-28"
    >
      {messages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: DYNAMIC_EASE }}
          className="flex h-full flex-col items-center justify-center p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
            className="border-border-subtle bg-surface-1 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted transition-colors duration-200"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: DYNAMIC_EASE }}
            className="text-primary mb-1 text-xl font-semibold transition-colors duration-200"
          >
            How can I help you today?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: DYNAMIC_EASE }}
            className="text-muted mx-auto mb-8 max-w-sm transition-colors duration-200"
          >
            Ask me anything about voice AI, speech-to-text, or audio
            intelligence implementation.
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "How to get started with real-time transcription?",
              "Explain your different voice AI models.",
              "How to reduce audio processing costs?",
            ].map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.2 + i * 0.1, ease: DYNAMIC_EASE },
                }}
                whileHover={{ y: -2, transition: { ease: DYNAMIC_EASE } }}
                onClick={() => onSuggestionClick(s)}
                className="border-border-subtle bg-surface-1/60 text-muted hover:border-border-subtle hover:bg-surface-1 rounded-full border px-4 py-2 text-sm transition-colors"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col gap-[var(--chat-gap)] p-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message, idx) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.3, ease: DYNAMIC_EASE }}
                className={clsx(
                  "group flex gap-4",
                  message.role === "user" ? "flex-row-reverse" : "",
                )}
              >
                <div
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200",
                    message.role === "user"
                      ? "bg-surface-2 text-secondary"
                      : message.role === "system"
                        ? "bg-accent-100 text-accent-500"
                        : "bg-surface-1 text-secondary",
                  )}
                >
                  {message.role === "system" ? "!" : null}
                </div>
                <div
                  className={clsx(
                    "flex max-w-[85%] flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <MessageDisplay
                    key={message.id}
                    message={message}
                    _isTyping={idx === messages.length - 1 && isTyping}
                    onTranslate={onTranslate}
                    onExplain={onExplain}
                    onSuggestionClick={onSuggestionClick}
                    onUpdateMessage={onUpdateMessage}
                    _isNewMessage={idx === messages.length - 1}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <div style={{ minHeight: 40 }}>
            {(isTyping || isPending) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ ease: DYNAMIC_EASE }}
                className="flex items-center gap-4"
              >
                <div className="bg-surface-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <BeamLoader size={18} />
                </div>
                <div className="border-border-subtle bg-surface-0 rounded-lg border p-4">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="bg-accent-500 h-1.5 w-1.5 rounded-full"
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
          </div>

          <div ref={messagesEndRef} />
          {showJump && (
            <button
              type="button"
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-surface-1 text-primary hover:bg-surface-2 ring-border-subtle/50 focus:ring-brand-primary glass-effect fixed right-4 bottom-4 z-30 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium shadow backdrop-blur-md"
            >
              Jump to latest ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatMessages;
