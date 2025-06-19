"use client";

import { useEffect, useMemo, useRef } from "react";
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

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    const container = containerRef.current?.closest(".chat-viewport");
    if (container && isStreaming) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }, 50);
      }
    }
  }, [content, isStreaming]);

  // Display content with cursor when streaming
  const displayContent = useMemo(() => {
    return isStreaming ? content + "▊" : content;
  }, [content, isStreaming]);

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
