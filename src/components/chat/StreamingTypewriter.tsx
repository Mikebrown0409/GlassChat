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

  // Reset state when message changes
  useEffect(() => {
    if (messageId !== currentMessageIdRef.current) {
      currentMessageIdRef.current = messageId;
      setDisplayedLength(0);
      completedRef.current = false;
    }
  }, [messageId]);

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

      if (modelType === "gpt") {
        // GPT: Fast, smooth word-by-word animation
        const wordRegex = /^(\s*\S+)/;
        const wordMatch = wordRegex.exec(remaining);
        if (wordMatch?.[1]) {
          return {
            size: wordMatch[1].length,
            delay: 25 + Math.random() * 15, // 25-40ms
          };
        }
        return { size: 1, delay: 30 };
      } else {
        // Gemini: Chunkier, block-like animation
        const sentenceRegex = /^[^.!?]*[.!?]\s*/;
        const sentenceMatch = sentenceRegex.exec(remaining);
        if (sentenceMatch?.[0] && sentenceMatch[0].length <= 100) {
          return {
            size: sentenceMatch[0].length,
            delay: 150 + Math.random() * 100, // 150-250ms
          };
        }

        const wordRegex = /^(\s*\S+)/;
        const wordMatch = wordRegex.exec(remaining);
        if (wordMatch?.[1]) {
          return {
            size: wordMatch[1].length,
            delay: 80 + Math.random() * 40, // 80-120ms
          };
        }
        return { size: 1, delay: 100 };
      }
    };

    const { size, delay } = getNextChunk();

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + size, content.length));
    }, delay);

    return () => clearTimeout(timer);
  }, [displayedLength, content, isComplete, modelType, onComplete]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[StreamingTypewriter] ${messageId}:`, {
        contentLength: content.length,
        displayedLength,
        isComplete,
        modelType,
      });
    }
  }, [displayedLength, content.length, isComplete, modelType, messageId]);

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
