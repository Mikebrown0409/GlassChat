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

      // If streaming is complete, show remaining content quickly but not instant
      if (isComplete && remaining.length > 5) {
        const chunkSize = Math.min(Math.ceil(remaining.length / 3), 30);
        const delay = modelType === "gpt" ? 15 : 25; // GPT faster completion than Gemini
        return { size: chunkSize, delay };
      }

      if (modelType === "gpt") {
        // GPT: Fast, snappy multi-word chunks - like ChatGPT's actual behavior
        const multiWordRegex = /^(\s*\S+(?:\s+\S+){0,2})/; // 1-3 words at once
        const multiWordMatch = multiWordRegex.exec(remaining);
        if (multiWordMatch?.[1] && multiWordMatch[1].length <= 25) {
          return {
            size: multiWordMatch[1].length,
            delay: 20 + Math.random() * 15, // 20-35ms - snappy but not too fast
          };
        }

        // Fallback: single word
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
        // Gemini: Chunky block streaming - visible but not instant
        const lineRegex = /^[^\n]*\n/;
        const lineMatch = lineRegex.exec(remaining);
        if (lineMatch?.[0] && lineMatch[0].length <= 60) {
          return {
            size: lineMatch[0].length,
            delay: 120 + Math.random() * 80, // 120-200ms - visible blocks
          };
        }

        // Phrase chunks (up to punctuation)
        const phraseRegex = /^[^.!?,:;]*[.!?,:;]?\s*/;
        const phraseMatch = phraseRegex.exec(remaining);
        if (phraseMatch?.[0] && phraseMatch[0].length <= 40) {
          return {
            size: phraseMatch[0].length,
            delay: 80 + Math.random() * 60, // 80-140ms - readable pace
          };
        }

        // Multi-word fallback
        const multiWordRegex = /^(\s*\S+(?:\s+\S+){0,1})/; // 1-2 words
        const multiWordMatch = multiWordRegex.exec(remaining);
        if (multiWordMatch?.[1]) {
          return {
            size: multiWordMatch[1].length,
            delay: 100 + Math.random() * 40, // 100-140ms
          };
        }
        return { size: 1, delay: 120 };
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
