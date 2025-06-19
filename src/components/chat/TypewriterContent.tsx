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
  const [displayedContent, setDisplayedContent] = useState("");
  const [buffer, setBuffer] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

  // Token buffering with flush interval (like ChatGPT)
  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, immediately show final content and parse markdown
      setDisplayedContent(content);
      setBuffer("");
      return;
    }

    // Add new content to buffer
    const newContent = content.slice(displayedContent.length);
    if (newContent) {
      setBuffer((prev) => prev + newContent);
    }

    // Flush buffer with optimized timing for smooth rendering
    const flushInterval = setInterval(() => {
      setBuffer((currentBuffer) => {
        if (currentBuffer) {
          setDisplayedContent((prev) => prev + currentBuffer);
          return "";
        }
        return currentBuffer;
      });
    }, 60); // Faster flush for smoother experience

    return () => clearInterval(flushInterval);
  }, [content, isStreaming, displayedContent.length]);

  // Throttled scroll to bottom
  useEffect(() => {
    const now = Date.now();
    if (now - lastScrollTime.current > 150) {
      // Throttle to every 150ms
      lastScrollTime.current = now;

      // Only scroll if user hasn't manually scrolled up
      const container = containerRef.current?.closest(".chat-viewport");
      if (container) {
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
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
    }
  }, [displayedContent]);

  // Reset when content changes completely (new message)
  useEffect(() => {
    if (content === "" || (!isStreaming && content !== displayedContent)) {
      setDisplayedContent(content);
      setBuffer("");
    }
  }, [content, isStreaming]);

  const contentWithCursor = useMemo(
    () => (isStreaming ? displayedContent + "▊" : displayedContent),
    [isStreaming, displayedContent],
  );

  return (
    <div
      ref={containerRef}
      className="min-h-[1.5rem] transition-opacity duration-200"
    >
      {isStreaming ? (
        // While streaming: render as plain text with pre-wrap for performance
        <div className="font-inherit leading-relaxed whitespace-pre-wrap">
          {contentWithCursor}
        </div>
      ) : (
        // When done: render with full markdown parsing
        <MarkdownContent
          content={contentWithCursor}
          role={role}
          _messageId={_messageId}
          _onUpdateMessage={_onUpdateMessage}
        />
      )}
    </div>
  );
}
