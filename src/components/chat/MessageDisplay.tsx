"use client";

import { clsx } from "clsx";
import { useSession } from "next-auth/react";
import React, { memo } from "react";
import { TextToSpeechButton } from "~/components/ui/TextToSpeechButton";
import type { Message } from "~/types/index";
import MarkdownContent from "./MarkdownContent";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { StreamingTypewriter } from "./StreamingTypewriter";
import { TextSelectionHandler } from "./TextSelectionHandler";

interface MessageDisplayProps {
  message: Message;
  _isTyping?: boolean;
  streamingContent?: string;
  onTranslate?: (text: string) => void;
  onExplain?: (text: string) => void;
  _isNewMessage?: boolean;
  onSuggestionClick?: (text: string) => void;
  onUpdateMessage?: (id: string, newContent: string) => void;
  onStreamingDone?: () => void;
  selectedModel?: string;
}

// UnifiedTypewriter removed – using ChunkTypewriter instead

// (Deprecated) old StreamingWrapper retained to avoid import churn

export const MessageDisplay = memo(function MessageDisplayComponent({
  message,
  _isTyping,
  streamingContent,
  onTranslate,
  onExplain,
  _isNewMessage,
  onSuggestionClick,
  onUpdateMessage,
  onStreamingDone,
  selectedModel,
}: MessageDisplayProps) {
  const { data: session } = useSession();

  const handleCopy = (_text: string) => {
    // Optional: Add any additional copy handling logic here
  };

  // Track when the streaming/typewriter animation is fully complete so we
  // can safely reveal the quick-action menu and TTS button.
  const [typingFinished, setTypingFinished] = React.useState(false);
  const [showQuickActions, setShowQuickActions] = React.useState(false);

  // Reset local completion state whenever we render a brand-new message ID.
  React.useEffect(() => {
    setTypingFinished(false);
    setShowQuickActions(false);
  }, [message.id]);

  // Handle animation completion from ChunkTypewriter
  const handleAnimationComplete = React.useCallback(() => {
    setTypingFinished(true);
    // Delay showing QuickActions to prevent infinite loops during state transitions
    setTimeout(() => {
      setShowQuickActions(true);
    }, 500); // 500ms delay to ensure all state is stable
    // Only call onStreamingDone after the typewriter animation is complete
    // This ensures the streaming state isn't cleared too early
    onStreamingDone?.();
  }, [onStreamingDone]);

  // For non-streaming messages, mark as finished immediately
  React.useEffect(() => {
    if (streamingContent === undefined && !_isTyping) {
      setTypingFinished(true);
      // Delay showing QuickActions for non-streaming messages too
      setTimeout(() => {
        setShowQuickActions(true);
      }, 200); // Shorter delay for non-streaming messages
    }
  }, [streamingContent, _isTyping]);

  // Check if this is a collaboration message and get sender info
  const isCollabMessage = Boolean(message.metadata?.isCollaborationMessage);
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
    isCollabMessage &&
    !isAIMessage &&
    senderName &&
    senderName !== currentUserName;

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
                    senderName
                      ? getUserColor(senderName)
                      : "border-gray-500/30 bg-gray-500/20 text-gray-300",
                  )}
                >
                  {senderName ?? "Unknown User"}
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
                  // Ensure bubble expands to contain all content with consistent sizing
                  "inline-block min-h-[3rem] min-w-full rounded-2xl p-4 shadow-sm backdrop-blur-sm transition-all duration-200",
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
                  {(() => {
                    const shouldUseTypewriter = streamingContent !== undefined;

                    // Helper function to determine model type from selectedModel string
                    const getModelType = (model?: string): "gpt" | "gemini" => {
                      if (!model) return "gpt";
                      if (model.includes("gpt")) return "gpt";
                      if (model.includes("gemini")) return "gemini";
                      return "gpt"; // default
                    };

                    // Debug logging removed to prevent console spam

                    return shouldUseTypewriter ? (
                      <StreamingTypewriter
                        content={streamingContent ?? ""}
                        isComplete={!_isTyping}
                        modelType={getModelType(selectedModel)}
                        messageId={message.id}
                        role={message.role}
                        onComplete={handleAnimationComplete}
                        onUpdateMessage={(newContent) =>
                          onUpdateMessage?.(message.id, newContent)
                        }
                      />
                    ) : (
                      <MarkdownContent
                        content={message.content}
                        role={message.role}
                        isStreaming={false}
                        _messageId={message.id}
                        _onUpdateMessage={(newContent) =>
                          onUpdateMessage?.(message.id, newContent)
                        }
                      />
                    );
                  })()}
                </div>
              </div>
            </TextSelectionHandler>

            {/* Meta controls inside bubble - only after streaming & typing complete */}
            {typingFinished &&
              !_isTyping &&
              streamingContent === undefined &&
              message.content && // Ensure content exists
              message.content.length > 0 && // Ensure content is not empty
              (message.role === "assistant" || isAIMessage) && (
                <div className="mt-1.5 space-y-1">
                  <div className="text-muted flex items-center gap-2">
                    {onSuggestionClick &&
                      message.content.length > 10 &&
                      showQuickActions && ( // Only show after delay
                        <QuickActionsMenu
                          content={message.content}
                          onSelect={onSuggestionClick}
                        />
                      )}
                    <TextToSpeechButton
                      text={message.content}
                      buttonSize={14}
                    />
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
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
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
