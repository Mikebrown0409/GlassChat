"use client";

import { clsx } from "clsx";
import dynamic from "next/dynamic";
import { memo } from "react";
import { TextToSpeechButton } from "~/components/ui/TextToSpeechButton";
import type { Message } from "~/types/index";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { TextSelectionHandler } from "./TextSelectionHandler";

interface MessageDisplayProps {
  message: Message;
  _isTyping?: boolean;
  onTranslate?: (text: string) => void;
  onExplain?: (text: string) => void;
  _isNewMessage?: boolean;
  onSuggestionClick?: (text: string) => void;
  onUpdateMessage?: (id: string, newContent: string) => void;
}

const MarkdownContent = dynamic(() => import("./MarkdownContent"), {
  ssr: false,
});

export const MessageDisplay = memo(function MessageDisplayComponent({
  message,
  _isTyping,
  onTranslate,
  onExplain,
  _isNewMessage,
  onSuggestionClick,
  onUpdateMessage,
}: MessageDisplayProps) {
  const handleCopy = (_text: string) => {
    // Optional: Add any additional copy handling logic here
  };

  return (
    <div
      className={clsx(
        "group relative w-full transition-colors duration-200",
        message.role === "user" ? "bg-transparent" : "bg-transparent",
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div
          className={clsx(
            "flex w-full",
            message.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={clsx(
              "flex max-w-[85%] min-w-0 flex-col",
              message.role === "user" && "items-end",
            )}
          >
            <TextSelectionHandler
              onCopy={handleCopy}
              onTranslate={onTranslate}
              onExplain={onExplain}
            >
              <div
                className={clsx(
                  "p-4",
                  message.role === "user"
                    ? "text-primary rounded-2xl bg-[color:var(--surface-user)] shadow-sm backdrop-blur-sm"
                    : "bg-surface-1 rounded-2xl shadow-sm backdrop-blur-sm",
                )}
              >
                <div className="prose prose-base dark:prose-invert max-w-none text-[16px] leading-relaxed break-words">
                  <MarkdownContent
                    content={message.content}
                    role={message.role}
                    messageId={message.id}
                    onUpdateMessage={(newContent) =>
                      onUpdateMessage?.(message.id, newContent)
                    }
                  />
                </div>
              </div>
            </TextSelectionHandler>

            {/* Meta controls inside bubble */}
            {message.role === "assistant" && (
              <div className="mt-2 space-y-1">
                <div className="text-muted flex items-center gap-0.5">
                  {onSuggestionClick && (
                    <QuickActionsMenu
                      content={message.content}
                      onSelect={onSuggestionClick}
                    />
                  )}
                  <TextToSpeechButton text={message.content} buttonSize={14} />
                </div>
                <span className="text-muted/80 block text-[11px]">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {message.role === "user" && (
              <span className="text-muted mt-1 self-end text-[11px]">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
