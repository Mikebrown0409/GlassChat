"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface TypewriterContentProps {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
  onDone?: () => void;
  _messageId?: string;
  _onUpdateMessage?: (newContent: string) => void;
}

export function TypewriterContent({
  content,
  role,
  isStreaming = false,
  onDone,
  _messageId,
  _onUpdateMessage,
}: TypewriterContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Smooth character animation -------------------------------------------------- */
  const [displayed, setDisplayed] = useState("");
  const [isTypewriterActive, setIsTypewriterActive] = useState(false); // Internal typewriter state
  const displayedRef = useRef("");
  const queueRef = useRef<string[]>([]);
  const animRef = useRef<number | null>(null);
  const lastFlushRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);
  const velocityRef = useRef<number>(1); // Dynamic typing speed multiplier

  const doneCalledRef = useRef(false);

  /* Intelligent cursor animation ------------------------------------------- */
  const [cursorOn, setCursorOn] = useState(true);
  const [cursorStyle, setCursorStyle] = useState<"typing" | "waiting">(
    "typing",
  );

  useEffect(() => {
    if (!isStreaming && !isTypewriterActive) return;

    // Different cursor behavior based on activity
    const updateCursor = () => {
      const queueLength = queueRef.current.length;

      if (queueLength > 0) {
        // Fast blink when actively typing
        setCursorStyle("typing");
        setCursorOn(true); // Keep solid when typing
      } else {
        // Slower blink when waiting for content
        setCursorStyle("waiting");
        setCursorOn((v) => !v);
      }
    };

    // Check cursor state more frequently for responsive feel
    const id = setInterval(updateCursor, 150);
    return () => clearInterval(id);
  }, [isStreaming, isTypewriterActive]);

  // Whenever upstream streaming content grows, push the diff into queue
  useEffect(() => {
    // Reset displayed content when new streaming starts
    if (isStreaming && displayed.length === 0 && content.length > 0) {
      console.log("[Typewriter] New stream starting - resetting state");
      setDisplayed("");
      displayedRef.current = "";
      queueRef.current = [];
      velocityRef.current = 1;
      setIsTypewriterActive(true);

      // Cancel any existing animation
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    }

    // Always set typewriter active when there's content to process
    if (isStreaming || queueRef.current.length > 0) {
      setIsTypewriterActive(true);
    }

    console.log("[Typewriter] Content update", {
      isStreaming,
      queueLength: queueRef.current.length,
      displayedLength: displayed.length,
      contentLength: content.length,
      isTypewriterActive,
    });

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

          // Dynamic timing for natural flow - faster for normal text, slower for punctuation
          const baseMinInterval = 12;
          const baseMaxInterval = 28;

          // Adjust speed based on queue length (catch up when behind, slow down when caught up)
          if (queueRef.current.length > 100) {
            velocityRef.current = Math.min(velocityRef.current * 1.1, 2.5); // Speed up
          } else if (queueRef.current.length < 10) {
            velocityRef.current = Math.max(velocityRef.current * 0.95, 0.7); // Slow down
          }

          const minInterval = baseMinInterval / velocityRef.current;
          const maxInterval = baseMaxInterval / velocityRef.current;
          const currentInterval =
            Math.random() * (maxInterval - minInterval) + minInterval;

          if (now - lastFlushRef.current < currentInterval) {
            animRef.current = requestAnimationFrame(step);
            return;
          }

          // Dynamic batch size based on content type and queue length
          let batchSize = 1;
          if (queueRef.current.length > 50) {
            batchSize = 3; // Catch up when far behind
          } else if (queueRef.current.length > 20) {
            batchSize = 2; // Moderate catchup
          }

          // Check if next characters are whitespace or punctuation for smoother word-level flow
          const nextChars = queueRef.current.slice(0, 5).join("");
          if (/^\s+/.test(nextChars)) {
            batchSize = Math.min(batchSize + 1, 4); // Push whitespace faster
          }

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

            // Natural pauses - more sophisticated than just punctuation
            if (/[\.\?\!]/.test(chr) && queueRef.current.length) {
              // Longer pause for sentence endings
              pauseUntilRef.current = Date.now() + (120 + Math.random() * 60);
            } else if (/[,;:]/.test(chr) && queueRef.current.length) {
              // Shorter pause for clause separators
              pauseUntilRef.current = Date.now() + (40 + Math.random() * 30);
            } else if (/[\n]/.test(chr) && queueRef.current.length) {
              // Medium pause for new lines
              pauseUntilRef.current = Date.now() + (80 + Math.random() * 40);
            }
          }

          if (queueRef.current.length) {
            lastFlushRef.current = now;
            animRef.current = requestAnimationFrame(step);
          } else {
            // Animation complete - queue is empty
            animRef.current = null;

            // Ensure final content displayed
            // Only finish typewriter when queue is empty (regardless of streaming state)
            console.log(
              "[Typewriter] Animation complete - queue empty, finishing typewriter",
            );
            setIsTypewriterActive(false);

            // Ensure we have the final content
            if (displayed !== content) {
              console.log("[Typewriter] Syncing final content", {
                displayedLength: displayed.length,
                contentLength: content.length,
              });
              setDisplayed(content);
            }

            // Reset velocity for next stream
            velocityRef.current = 1;

            if (!doneCalledRef.current) {
              doneCalledRef.current = true;
              onDone?.();
            }
          }
        };
        animRef.current = requestAnimationFrame(step);
      }
    }
  }, [content, isStreaming, displayed.length]);

  // Separate effect to handle final state when streaming completely ends
  useEffect(() => {
    if (!isStreaming && !isTypewriterActive && queueRef.current.length === 0) {
      // Final cleanup - ensure we have the complete content
      if (displayed !== content) {
        setDisplayed(content);
      }

      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onDone?.();
      }
    }
  }, [isStreaming, isTypewriterActive, content, displayed]);

  /* Auto-scroll ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isStreaming && !isTypewriterActive) return;
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
  }, [displayed, isStreaming, isTypewriterActive]);

  // Display content with intelligent cursor when streaming
  const displayContent = useMemo(() => {
    const shouldShowCursor = isStreaming || isTypewriterActive;
    if (!shouldShowCursor) return displayed;

    // Different cursor appearance based on state
    const cursor = cursorOn
      ? cursorStyle === "typing"
        ? "▊"
        : "▊"
      : cursorStyle === "waiting"
        ? " "
        : "";

    return displayed + cursor;
  }, [displayed, isStreaming, isTypewriterActive, cursorOn, cursorStyle]);

  // keep ref in sync
  useEffect(() => {
    displayedRef.current = displayed;
  }, [displayed]);

  return (
    <div
      ref={containerRef}
      className="min-h-[1.5rem] transition-opacity duration-200"
    >
      {isStreaming || isTypewriterActive ? (
        // While streaming or typewriter is active: render with basic markdown support
        <div className="font-inherit leading-relaxed transition-opacity duration-75">
          <MarkdownContent
            content={displayContent}
            role={role}
            _messageId={_messageId}
            _onUpdateMessage={_onUpdateMessage}
            isStreaming={true} // Pass streaming flag to markdown component
          />
        </div>
      ) : (
        // When completely done: render with full markdown parsing and smooth transition
        <div className="transition-opacity duration-300 ease-in-out">
          <MarkdownContent
            content={displayContent}
            role={role}
            _messageId={_messageId}
            _onUpdateMessage={_onUpdateMessage}
            isStreaming={false}
          />
        </div>
      )}
    </div>
  );
}
