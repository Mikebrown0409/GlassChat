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
  const queueRef = useRef<string[]>([]);
  const animRef = useRef<number | null>(null);

  // Whenever upstream streaming content grows, push the diff into queue
  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, jump to full content immediately
      setDisplayed(content);
      queueRef.current = [];
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
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
          // Adaptive batch size: 1 char/frame for first 300 chars, then +1 every 300 chars up to 4
          const totalPrinted = displayed.length;
          const batchSize = Math.min(4, 1 + Math.floor(totalPrinted / 300));

          let pushed = 0;
          while (pushed < batchSize && queueRef.current.length) {
            const chr = queueRef.current.shift();
            if (chr) {
              pushed += 1;
              setDisplayed((prev) => prev + chr);
            }
          }

          if (queueRef.current.length) {
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
        container.scrollTop = container.scrollHeight; // instant for minimal jitter
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [displayed, isStreaming]);

  // Display content with cursor when streaming
  const displayContent = useMemo(() => {
    return isStreaming ? displayed + "▊" : displayed;
  }, [displayed, isStreaming]);

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
