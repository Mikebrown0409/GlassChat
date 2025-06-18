"use client";

import { clsx } from "clsx";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();

  const handleCopy = (_text: string) => {
    // Optional: Add any additional copy handling logic here
  };

  // Check if this is a collaboration message and get sender info
  const isCollabMessage = message.metadata?.isCollaborationMessage;
  const senderName = message.metadata?.sender;
  const isAIMessage = senderName === "AI Assistant";

  // Get current user name from session
  const currentUserName =
    session?.user?.name ?? session?.user?.email ?? "Anonymous";

  // Determine message type and positioning
  const isCurrentUser = isCollabMessage
    ? senderName === currentUserName
    : message.role === "user"; // Regular non-collab messages
  const isOtherUser =
    isCollabMessage && !isAIMessage && senderName !== currentUserName;

  // Generate consistent color for user based on their name
  const getUserColor = (name: string) => {
    // Current user always gets blue
    if (name === currentUserName) {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    // AI Assistant always gets purple
    if (name === "AI Assistant") {
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }

    // Other users get varied colors (excluding blue and purple)
    const colors = [
      "bg-green-500/20 text-green-300 border-green-500/30",
      "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      "bg-pink-500/20 text-pink-300 border-pink-500/30",
      "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    ];
    const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
            // Current user messages stay on right, everything else on left
            isCurrentUser ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={clsx(
              "flex flex-col",
              // Set max width but ensure content can expand naturally
              "max-w-[85%] min-w-fit",
              isCurrentUser && "items-end",
            )}
          >
            {/* Show sender name for collaboration messages */}
            {isCollabMessage && senderName && (
              <div
                className={clsx(
                  "mb-2 flex w-full",
                  isCurrentUser ? "justify-end" : "justify-start",
                )}
              >
                <span
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                    getUserColor(senderName),
                  )}
                >
                  {senderName}
                </span>
              </div>
            )}
            <TextSelectionHandler
              onCopy={handleCopy}
              onTranslate={onTranslate}
              onExplain={onExplain}
            >
              <div
                className={clsx(
                  // Ensure bubble expands to contain all content
                  "inline-block min-w-full rounded-2xl p-4 shadow-sm backdrop-blur-sm",
                  // Current user: use the existing user styling
                  isCurrentUser &&
                    "text-primary bg-[color:var(--surface-user)]",
                  // AI messages: use assistant styling
                  isAIMessage && "bg-surface-1",
                  // Other users: use solid background to ensure full coverage
                  isOtherUser &&
                    "border border-zinc-700/50 bg-zinc-800 text-zinc-100",
                )}
              >
                <div className="prose prose-base dark:prose-invert word-wrap max-w-none text-[16px] leading-relaxed break-words">
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
            {(message.role === "assistant" || isAIMessage) && (
              <div className="mt-1.5 space-y-1">
                <div className="text-muted flex items-center gap-2">
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

            {/* Timestamp for user messages (both current user and other users) */}
            {(message.role === "user" || isOtherUser || isCurrentUser) &&
              !isAIMessage && (
                <span
                  className={clsx(
                    "text-muted mt-1 text-[11px]",
                    isCurrentUser ? "self-end" : "self-start",
                  )}
                >
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
