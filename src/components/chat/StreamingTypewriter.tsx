"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";

interface StreamingTypewriterProps {
  content: string;
  isComplete: boolean;
  modelType: "gpt" | "gemini";
  messageId: string;
  role: "user" | "assistant" | "system";
  onComplete?: () => void;
  onUpdateMessage?: (newContent: string) => void;
}

/**
 * StreamingTypewriter - Simple, reliable typewriter animation
 *
 * Key principles:
 * - Single piece of state (displayedLength)
 * - One useEffect with stable dependencies
 * - Model-based timing differentiation
 * - No complex refs or lifecycle management
 */
export function StreamingTypewriter({
  content,
  isComplete,
  modelType,
  messageId,
  role,
  onComplete,
  onUpdateMessage,
}: StreamingTypewriterProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const completedRef = useRef(false);
  const currentMessageIdRef = useRef(messageId);
  const startTimeRef = useRef<number>(Date.now());

  // Reset state when message changes
  useEffect(() => {
    if (messageId !== currentMessageIdRef.current) {
      currentMessageIdRef.current = messageId;
      setDisplayedLength(0);
      completedRef.current = false;
      startTimeRef.current = Date.now(); // reset timer for new message
    }
  }, [messageId]);

  // Gemini instant first-paragraph reveal
  useEffect(() => {
    if (
      modelType === "gemini" &&
      displayedLength === 0 &&
      content.length > 120
    ) {
      // grab up to first newline or 100 chars
      const firstBreak = content.indexOf("\n");
      const revealLength =
        firstBreak !== -1 && firstBreak < 120 ? firstBreak + 1 : 100;
      setDisplayedLength(Math.min(revealLength, content.length));
    }
    // run only once when content first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, modelType]);

  // Simple animation logic
  useEffect(() => {
    // If we've displayed all content
    if (displayedLength >= content.length) {
      // If streaming is complete and we haven't called onComplete yet
      if (isComplete && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    // Calculate next chunk size and delay based on model type
    const getNextChunk = () => {
      const remaining = content.slice(displayedLength);
      const elapsed = Date.now() - startTimeRef.current;

      // If streaming is complete, drain quickly but keep a tiny delay for polish
      if (isComplete && remaining.length > 5) {
        const chunkSize = Math.min(Math.ceil(remaining.length / 2), 60);
        const delay = modelType === "gpt" ? 10 : 20;
        return { size: chunkSize, delay };
      }

      if (modelType === "gpt") {
        // GPT acceleration curve ----------------------------------------
        //   < 400 ms  → small (1-2 words)   28-35 ms
        //   400-2000 ms → medium (3-4 words) 14-22 ms
        //   > 2000 ms → large (5-6 words)   6-12 ms

        const phase = elapsed < 400 ? 0 : elapsed < 2000 ? 1 : 2;
        const wordCount = phase === 0 ? 2 : phase === 1 ? 4 : 6;
        const regex = new RegExp(`^(\\s*\\S+(?:\\s+\\S+){0,${wordCount - 1}})`);

        const match = regex.exec(remaining);
        if (match?.[1]) {
          const baseDelay = phase === 0 ? 30 : phase === 1 ? 18 : 8;
          return {
            size: match[1].length,
            delay: baseDelay + Math.random() * (baseDelay * 0.6),
          };
        }

        // fallback char-by-char
        return { size: 1, delay: 20 };
      } else {
        // Gemini acceleration curve ------------------------------------
        //   < 600 ms  → line (≤60)  110-160 ms
        //   600-3000 ms → phrase (≤80) 60-100 ms
        //   > 3000 ms  → sentence/large (≤120) 35-60 ms

        const phase = elapsed < 600 ? 0 : elapsed < 3000 ? 1 : 2;

        if (phase === 0) {
          const lineMatch = /^[^\n]*\n?/.exec(remaining);
          if (lineMatch?.[0]) {
            return {
              size: Math.min(lineMatch[0].length, 60),
              delay: 110 + Math.random() * 50,
            };
          }
        }

        const phraseMatch = /^[^.!?]*[.!?]?\s*/.exec(remaining);
        if (phraseMatch?.[0]) {
          const sizeLimit = phase === 1 ? 80 : 120;
          const baseDelay = phase === 1 ? 70 : 40;
          return {
            size: Math.min(phraseMatch[0].length, sizeLimit),
            delay: baseDelay + Math.random() * (baseDelay * 0.6),
          };
        }

        // fallback word
        const wordMatch = /^(\s*\S+)/.exec(remaining);
        if (wordMatch?.[1]) {
          return { size: wordMatch[1].length, delay: 90 };
        }
        return { size: 1, delay: 110 };
      }
    };

    const { size, delay } = getNextChunk();

    // Debug logging removed to prevent console spam

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + size, content.length));
    }, delay);

    return () => clearTimeout(timer);
  }, [displayedLength, content, isComplete, modelType, onComplete]);

  // Debug logging removed to prevent console spam

  // Show the animated content
  const displayedContent = content.slice(0, displayedLength);
  const showCursor = displayedLength < content.length || !isComplete;

  return (
    <div className="streaming-typewriter">
      <MarkdownContent
        content={displayedContent + (showCursor ? "▊" : "")}
        role={role}
        isStreaming={!isComplete}
        _messageId={messageId}
        _onUpdateMessage={onUpdateMessage}
      />
    </div>
  );
}
