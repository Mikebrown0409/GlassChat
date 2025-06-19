"use client";

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
  // Show a cursor when still streaming - use a simple text cursor
  const contentWithCursor = isStreaming ? content + "▊" : content;

  return (
    <MarkdownContent
      content={contentWithCursor}
      role={role}
      _messageId={_messageId}
      _onUpdateMessage={_onUpdateMessage}
    />
  );
}
