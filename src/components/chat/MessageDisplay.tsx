"use client";

import { clsx } from "clsx";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "~/types/index";
import { CodeBlock } from "./CodeBlock";
import { TextSelectionHandler } from "./TextSelectionHandler";

interface MessageDisplayProps {
  message: Message;
  _isTyping?: boolean;
  onTranslate?: (text: string) => void;
  onExplain?: (text: string) => void;
  _isNewMessage?: boolean;
}

export const MessageDisplay = memo(function MessageDisplayComponent({
  message,
  _isTyping,
  onTranslate,
  onExplain,
  _isNewMessage,
}: MessageDisplayProps) {
  const handleCopy = (_text: string) => {
    // Optional: Add any additional copy handling logic here
  };

  return (
    <div
      className={clsx(
        "group relative w-full transition-colors duration-200",
        message.role === "user" ? "bg-surface-1/90" : "bg-surface-0/90",
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
                    ? "rounded-2xl bg-[#2a2a2a] shadow-sm dark:bg-[#1a1a1a]"
                    : "bg-surface-0/30 border-surface-1/10 rounded-lg border backdrop-blur-[2px]",
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ children }) => (
                        <div className="overflow-x-auto">{children}</div>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto">{children}</div>
                      ),
                      p: ({ children, ...props }) => {
                        let isShortMessage = false;
                        if (message.role === "user") {
                          if (typeof children === "string") {
                            isShortMessage = children.length < 50;
                          } else if (
                            Array.isArray(children) &&
                            children.every((c) => typeof c === "string")
                          ) {
                            isShortMessage = children.join("").length < 50;
                          }
                        }
                        return (
                          <p
                            className={clsx(
                              "mb-4 last:mb-0",
                              message.role === "user"
                                ? isShortMessage
                                  ? "whitespace-nowrap"
                                  : "whitespace-normal"
                                : "whitespace-pre-wrap",
                            )}
                            {...props}
                          >
                            {children}
                          </p>
                        );
                      },
                      // @ts-expect-error inline is present in ReactMarkdown code renderer
                      code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className ?? "");
                        if (!inline && match?.[1]) {
                          let codeString = "";
                          if (typeof children === "string") {
                            codeString = children.replace(/\n$/, "");
                          } else if (
                            Array.isArray(children) &&
                            children.every((c) => typeof c === "string")
                          ) {
                            codeString = children.join("").replace(/\n$/, "");
                          }
                          return (
                            <CodeBlock language={match[1]} {...props}>
                              {codeString}
                            </CodeBlock>
                          );
                        }
                        return (
                          <code
                            className={clsx(
                              "bg-surface-2 rounded px-1 py-0.5 font-mono",
                              className,
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </TextSelectionHandler>

            <span
              className={clsx(
                "text-muted mt-1 text-xs",
                message.role === "user" ? "self-end" : "self-start",
              )}
            >
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
