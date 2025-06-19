"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface TypingAnimationProps {
  content: string;
  speed?: number; // characters per second
  delayBeforeStart?: number; // ms
  onComplete?: () => void;
  onInterrupt?: () => void;
  allowInterrupt?: boolean;
  className?: string;
}

interface TypingState {
  displayedContent: string;
  isTyping: boolean;
  isComplete: boolean;
  currentIndex: number;
}

export function TypingAnimation({
  content,
  speed = 60, // 60 chars/sec ≈ 40-50 WPM
  delayBeforeStart = 500,
  onComplete,
  onInterrupt,
  allowInterrupt = true,
  className = "",
}: TypingAnimationProps) {
  const [state, setState] = useState<TypingState>({
    displayedContent: "",
    isTyping: false,
    isComplete: false,
    currentIndex: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInterruptedRef = useRef(false);

  // Calculate typing delay based on speed
  const typingDelay = 1000 / speed;

  // Natural pause patterns
  const getPauseAfterChar = useCallback(
    (char: string, _nextChar?: string) => {
      // Longer pauses after sentence endings
      if (char === "." || char === "!" || char === "?") {
        return Math.random() * 300 + 400; // 400-700ms
      }
      // Medium pauses after commas and colons
      if (char === "," || char === ":" || char === ";") {
        return Math.random() * 150 + 200; // 200-350ms
      }
      // Short pauses after line breaks
      if (char === "\n") {
        return Math.random() * 100 + 150; // 150-250ms
      }
      // Slight variation in normal typing speed
      return typingDelay + (Math.random() * 20 - 10); // ±10ms variation
    },
    [typingDelay],
  );

  // Handle typing animation
  const typeNextCharacter = useCallback(() => {
    if (isInterruptedRef.current) return;

    setState((prevState) => {
      if (prevState.currentIndex >= content.length) {
        return {
          ...prevState,
          isTyping: false,
          isComplete: true,
        };
      }

      const nextIndex = prevState.currentIndex + 1;
      const newDisplayedContent = content.slice(0, nextIndex);
      const currentChar = content[prevState.currentIndex];
      const nextChar = content[nextIndex];

      // Schedule next character
      const pauseTime = getPauseAfterChar(currentChar!, nextChar);
      timeoutRef.current = setTimeout(typeNextCharacter, pauseTime);

      return {
        ...prevState,
        displayedContent: newDisplayedContent,
        currentIndex: nextIndex,
      };
    });
  }, [content, getPauseAfterChar]);

  // Start typing animation
  const startTyping = useCallback(() => {
    if (isInterruptedRef.current) return;

    setState((prev) => ({ ...prev, isTyping: true }));
    timeoutRef.current = setTimeout(typeNextCharacter, delayBeforeStart);
  }, [typeNextCharacter, delayBeforeStart]);

  // Handle interrupt (click or key press)
  const handleInterrupt = useCallback(() => {
    if (!allowInterrupt || state.isComplete) return;

    isInterruptedRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      displayedContent: content,
      isTyping: false,
      isComplete: true,
      currentIndex: content.length,
    });

    onInterrupt?.();
  }, [allowInterrupt, state.isComplete, content, onInterrupt]);

  // Auto-scroll to follow typing
  useEffect(() => {
    if (containerRef.current && state.isTyping) {
      const container = containerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [state.displayedContent, state.isTyping]);

  // Handle completion
  useEffect(() => {
    if (state.isComplete && !isInterruptedRef.current) {
      onComplete?.();
    }
  }, [state.isComplete, onComplete]);

  // Keyboard interrupt handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        handleInterrupt();
      }
    };

    if (allowInterrupt && state.isTyping) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }

    // Return undefined if no cleanup needed
    return undefined;
  }, [allowInterrupt, state.isTyping, handleInterrupt]);

  // Start animation on mount
  useEffect(() => {
    startTyping();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInterruptedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`typing-animation-container ${className}`}
      onClick={handleInterrupt}
      style={{
        cursor: allowInterrupt && state.isTyping ? "pointer" : "default",
      }}
    >
      {/* Typing content */}
      <div className="relative">
        <MarkdownContent content={state.displayedContent} role="assistant" />

        {/* Typing cursor */}
        {state.isTyping && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-text-bottom" />
        )}
      </div>

      {/* Subtle interrupt hint - only show on hover */}
      {allowInterrupt && state.isTyping && (
        <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-60">
          <div className="rounded bg-black/80 px-2 py-1 text-xs text-white shadow-lg">
            Click to show full response
          </div>
        </div>
      )}
    </div>
  );
}
