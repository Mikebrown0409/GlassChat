"use client";

import { GlassContainer } from "@/components/ui/GlassContainer";
import type { Message } from "@/lib/db";
import { SyncStatus, useLiveMessages } from "@/lib/sync";
import { parseMarkdownWasm } from "@/lib/utils/markdownWasm";
import { clsx } from "clsx";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface MessageListProps {
  chatId: string;
  className?: string;
}

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

const Virtuoso = dynamic(
  () => import("react-virtuoso").then((m) => m.Virtuoso),
  { ssr: false },
);

const MessageBubble = React.memo(function MessageBubble({
  message,
  isLast,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const [wasmHtml, setWasmHtml] = useState<string | null>(null);

  useEffect(() => {
    // Use WASM parser for long messages (> 750 chars) to improve perf
    if (message.content.length > 750) {
      void parseMarkdownWasm(message.content).then(setWasmHtml);
    } else {
      setWasmHtml(null);
    }
  }, [message.content]);

  const renderedMarkdown = useMemo(() => {
    if (wasmHtml) {
      return <div dangerouslySetInnerHTML={{ __html: wasmHtml }} />;
    }

    return (
      <ReactMarkdown
        components={{
          // Custom code block styling
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return (
              <code
                className={clsx(
                  isInline
                    ? "rounded bg-black/20 px-1 py-0.5 text-sm"
                    : "block overflow-x-auto rounded-lg bg-black/30 p-3 text-sm",
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom link styling
          a: ({ children, ...props }) => (
            <a
              className={clsx(
                "underline decoration-2 underline-offset-2",
                isUser
                  ? "text-blue-200 hover:text-blue-100"
                  : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
              )}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  }, [message.content, wasmHtml, isUser]);

  return (
    <div
      className={clsx(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        "mb-4",
        isLast && "mb-6", // Extra spacing for last message
      )}
      style={{
        contentVisibility: "auto", // Chrome 85+; skips off-screen rendering
        containIntrinsicSize: "300px", // Reserve approx height to reduce CLS
      }}
    >
      <div
        className={clsx(
          "max-w-[80%] min-w-[120px]",
          isUser && "ml-12", // Push user messages to right
          !isUser && "mr-12", // Push assistant messages to left
        )}
      >
        <GlassContainer
          className={clsx(
            "glass-optimized p-4",
            isUser && "text-white",
            !isUser && !isSystem && "text-gray-900 dark:text-gray-100",
            isSystem && "text-yellow-900 dark:text-yellow-100",
          )}
          blur="lg"
          rounded="lg"
          hover={true}
          gradient={isUser || isSystem}
          animated
          scale
          shadow="lg"
          opacity={isUser ? "high" : "medium"}
        >
          {/* Message metadata */}
          <div className="mb-2 flex items-center justify-between">
            <span
              className={clsx(
                "text-xs font-medium",
                isUser
                  ? "text-blue-100"
                  : isSystem
                    ? "text-yellow-800 dark:text-yellow-200"
                    : "text-gray-500 dark:text-gray-400",
              )}
            >
              {message.role === "user"
                ? "You"
                : message.role === "system"
                  ? "System"
                  : "Assistant"}
            </span>
            <span
              className={clsx(
                "text-xs",
                isUser
                  ? "text-blue-200"
                  : isSystem
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-gray-400 dark:text-gray-500",
              )}
            >
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Message content with markdown support */}
          <div
            className={clsx(
              "prose prose-sm max-w-none",
              isUser && "prose-invert",
              isSystem && "prose-yellow",
              "prose-headings:text-current prose-p:text-current",
              "prose-code:text-current prose-pre:bg-black/20",
              "prose-blockquote:border-current prose-blockquote:text-current",
            )}
          >
            {renderedMarkdown}
          </div>

          {/* Sync status indicator for development */}
          {message.syncStatus !== SyncStatus.SYNCED && (
            <div className="mt-2 flex items-center gap-1">
              <div
                className={clsx(
                  "h-2 w-2 rounded-full",
                  message.syncStatus === SyncStatus.PENDING && "bg-yellow-400",
                  message.syncStatus === SyncStatus.SYNCING &&
                    "animate-pulse bg-blue-400",
                  message.syncStatus === SyncStatus.ERROR && "bg-red-400",
                )}
              />
              <span
                className={clsx(
                  "text-xs",
                  isUser ? "text-blue-200" : "text-gray-400 dark:text-gray-500",
                )}
              >
                {message.syncStatus.toLowerCase()}
              </span>
            </div>
          )}
        </GlassContainer>
      </div>
    </div>
  );
});

export function MessageList({ chatId, className }: MessageListProps) {
  const messages = useLiveMessages(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const shouldVirtualize = (messages?.length ?? 0) > 100;

  if (shouldVirtualize) {
    return (
      <Virtuoso
        data={messages}
        itemContent={(index, message: unknown) => {
          const msg = message as Message;
          return (
            <MessageBubble
              message={msg}
              isLast={index === (messages?.length ?? 0) - 1}
            />
          );
        }}
        style={{ height: "100%" }}
        className={clsx("flex-1", className)}
      />
    );
  }

  if (!messages) {
    return (
      <div
        className={clsx("flex flex-1 items-center justify-center", className)}
      >
        <GlassContainer
          className="p-8"
          gradient
          animated
          blur="xl"
          shadow="xl"
          pulse
        >
          <div className="flex animate-pulse space-x-4">
            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700"></div>
              <div className="h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700"></div>
            </div>
          </div>
        </GlassContainer>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        className={clsx("flex flex-1 items-center justify-center", className)}
      >
        <GlassContainer
          className="p-8 text-center"
          gradient
          animated
          blur="xl"
          shadow="xl"
          hover
          scale
        >
          <div className="text-gray-500 dark:text-gray-400">
            <div className="animate-glass-float mb-2 text-2xl">💬</div>
            <p className="font-medium">Start a conversation</p>
            <p className="mt-1 text-sm">
              Send a message to begin chatting with AI
            </p>
          </div>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div
      className={clsx("glass-scrollbar flex-1 overflow-y-auto", className)}
      style={{ overflowAnchor: "none" }}
    >
      <div className="space-y-0 p-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === messages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default MessageList;
