"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface TypewriterContentProps {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
  _messageId?: string;
  _onUpdateMessage?: (newContent: string) => void;
}

export function TypewriterContent({
  content,
  role,
  isStreaming = false,
  _messageId,
  _onUpdateMessage,
}: TypewriterContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Smooth character animation -------------------------------------------------- */
  const [displayed, setDisplayed] = useState("");
  const displayedRef = useRef("");
  const queueRef = useRef<string[]>([]);
  const animRef = useRef<number | null>(null);
  const lastFlushRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);

  /* Blinking cursor ------------------------------------------- */
  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => setCursorOn((v) => !v), 500);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Whenever upstream streaming content grows, push the diff into queue
  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, jump to full content immediately
      setDisplayed(content);
      displayedRef.current = "";
      return;
    }

    // Calculate new content that has not yet been queued or displayed
    const alreadyHandled = displayed.length + queueRef.current.length;
    const diff = content.slice(alreadyHandled);
    if (diff) {
      queueRef.current.push(...diff.split(""));
      // Kick animation loop if not already running
      if (!animRef.current) {
        const step = () => {
          const now = Date.now();

          // Handle punctuation pause
          if (now < pauseUntilRef.current) {
            animRef.current = requestAnimationFrame(step);
            return;
          }

          // Throttle flushes to every 35-40ms for smooth cadence
          if (now - lastFlushRef.current < 35) {
            animRef.current = requestAnimationFrame(step);
            return;
          }

          const batchSize = 2; // constant small batch for stability
          let pushed = 0;
          while (pushed < batchSize && queueRef.current.length) {
            const chr = queueRef.current.shift();
            if (!chr) break;

            pushed += 1;
            setDisplayed((prev) => {
              const next = prev + chr;
              displayedRef.current = next;
              return next;
            });

            // Insert natural pause after punctuation
            if (/[\.\?\!]/.test(chr) && queueRef.current.length) {
              pauseUntilRef.current = Date.now() + 160;
            }
          }

          if (queueRef.current.length) {
            lastFlushRef.current = now;
            animRef.current = requestAnimationFrame(step);
          } else {
            animRef.current = null;
          }
        };
        animRef.current = requestAnimationFrame(step);
      }
    }
  }, [content, isStreaming, displayed.length]);

  /* Auto-scroll ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isStreaming) return;
    const container = containerRef.current?.closest(".chat-viewport");
    if (!container) return;

    const raf = requestAnimationFrame(() => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        120;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [displayed, isStreaming]);

  // Display content with cursor when streaming
  const displayContent = useMemo(() => {
    return isStreaming ? displayed + (cursorOn ? "▊" : "") : displayed;
  }, [displayed, isStreaming, cursorOn]);

  // keep ref in sync
  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);

  return (
    <div
      ref={containerRef}
      className="min-h-[1.5rem] transition-opacity duration-200"
    >
      {isStreaming ? (
        // While streaming: render as plain text with pre-wrap for performance
        <div className="font-inherit leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </div>
      ) : (
        // When done: render with full markdown parsing
        <MarkdownContent
          content={displayContent}
          role={role}
          _messageId={_messageId}
          _onUpdateMessage={_onUpdateMessage}
        />
      )}
    </div>
  );
}
