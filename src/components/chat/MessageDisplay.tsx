"use client";

import { clsx } from "clsx";
import "katex/dist/katex.min.css";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { TextToSpeechButton } from "~/components/ui/TextToSpeechButton";
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
                <div className="prose prose-base dark:prose-invert max-w-none text-[15px] leading-relaxed break-words">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm,
                      remarkBreaks as any,
                      remarkMath as any,
                    ]}
                    rehypePlugins={[rehypeKatex as any]}
                    components={{
                      pre: ({ children }) => (
                        <div className="overflow-x-auto">{children}</div>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left">
                            {children}
                          </table>
                        </div>
                      ),
                      p: ({ children, ...props }) => {
                        // Determine if the paragraph is short enough that we should prevent an early line-wrap.
                        let isShortMessage = false;

                        if (typeof children === "string") {
                          isShortMessage = children.length < 50;
                        } else if (
                          Array.isArray(children) &&
                          children.every((c) => typeof c === "string")
                        ) {
                          isShortMessage = children.join("").length < 50;
                        }

                        return (
                          <p
                            className={clsx(
                              "mb-4 last:mb-0",
                              isShortMessage
                                ? "whitespace-nowrap"
                                : // Longer messages fall back to role-specific whitespace handling.
                                  message.role === "user"
                                  ? "whitespace-normal"
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
                            <div className="my-4">
                              <CodeBlock language={match[1]} {...props}>
                                {codeString}
                              </CodeBlock>
                            </div>
                          );
                        }
                        // Handle inline code with language specification
                        if (match?.[1]) {
                          let codeString = "";
                          if (typeof children === "string") {
                            codeString = children;
                          } else if (
                            Array.isArray(children) &&
                            children.every((c) => typeof c === "string")
                          ) {
                            codeString = children.join("");
                          }
                          return (
                            <CodeBlock language={match[1]} isInline {...props}>
                              {codeString}
                            </CodeBlock>
                          );
                        }
                        // Handle regular inline code without language
                        return (
                          <code
                            className={clsx(
                              "bg-surface-2 rounded px-1 py-0.5 font-mono text-sm",
                              className,
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      img: ({ src, alt, ...props }) => {
                        if (!src || typeof src !== "string") return null;
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={typeof alt === "string" ? alt : "Image"}
                            className="max-w-full rounded"
                            {...props}
                          />
                        );
                      },
                      h1: ({ children, ...props }) => (
                        <h1 className="mb-4 text-2xl font-bold" {...props}>
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2 className="mb-3 text-xl font-bold" {...props}>
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3 className="mb-2 text-lg font-bold" {...props}>
                          {children}
                        </h3>
                      ),
                      h4: ({ children, ...props }) => (
                        <h4 className="mb-2 text-base font-bold" {...props}>
                          {children}
                        </h4>
                      ),
                      h5: ({ children, ...props }) => (
                        <h5 className="mb-1 text-sm font-bold" {...props}>
                          {children}
                        </h5>
                      ),
                      h6: ({ children, ...props }) => (
                        <h6 className="mb-1 text-xs font-bold" {...props}>
                          {children}
                        </h6>
                      ),
                      ul: ({ children, ...props }) => (
                        <ul className="mb-4 list-inside list-disc" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ children, ...props }) => (
                        <ol
                          className="mb-4 list-inside list-decimal"
                          {...props}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => (
                        <li className="mb-1" {...props}>
                          {children}
                        </li>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote
                          className="border-surface-2 my-4 border-l-4 pl-4 italic"
                          {...props}
                        >
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="border-surface-2 my-4" />,
                      a: ({ children, href, ...props }) => (
                        <a
                          href={href}
                          className="text-blue-500 underline hover:text-blue-600"
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
                </div>
              </div>
            </TextSelectionHandler>

            {/* TTS button for assistant messages */}
            {message.role === "assistant" && (
              <div className="mt-2">
                <TextToSpeechButton text={message.content} buttonSize={20} />
              </div>
            )}

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
