"use client";

import { clsx } from "clsx";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "~/types/index";
import { CodeBlock } from "./CodeBlock";

interface MessageDisplayProps {
  message: Message;
  onTextSelect?: (
    text: string,
    position: { top: number; left: number },
  ) => void;
  isNewMessage?: boolean;
}

const MessageDisplay = memo(function MessageDisplay({
  message,
  onTextSelect,
  isNewMessage = false,
}: MessageDisplayProps) {
  const [displayedContent, setDisplayedContent] = useState(message.content);
  const [isTyping, setIsTyping] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (message.role === "user" || !isNewMessage || hasAnimated.current) {
      setDisplayedContent(message.content);
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    const content = message.content;
    const typingSpeed = content.length > 1000 ? 5 : 20;

    const typeNextChar = () => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        setIsTyping(false);
        hasAnimated.current = true;
      }
    };

    setDisplayedContent("");
    setIsTyping(true);
    typeNextChar();

    return () => {
      currentIndex = content.length;
    };
  }, [message.content, message.role, isNewMessage]);

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (!onTextSelect) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const position = {
        top: rect.top - 50,
        left: rect.left + rect.width / 2,
      };
      onTextSelect(selection.toString(), position);
    }
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      className={clsx(
        "group relative w-full transition-colors duration-200",
        message.role === "user" ? "bg-surface-1/90" : "bg-surface-0/90",
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div
          className={clsx(
            "relative",
            message.role === "user"
              ? "ml-auto flex max-w-[85%] justify-end"
              : "w-full",
          )}
        >
          <div
            className={clsx(
              "p-4",
              message.role === "user"
                ? "rounded-2xl bg-[#2a2a2a] shadow-sm dark:bg-[#1a1a1a]"
                : "bg-surface-0/30 border-surface-1/10 rounded-lg border backdrop-blur-[2px]",
            )}
          >
            <div
              className={clsx(
                "prose prose-sm dark:prose-invert",
                message.role === "user" ? "!max-w-none" : "max-w-none",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({
                    inline = false,
                    className,
                    children,
                    ...props
                  }: {
                    inline?: boolean;
                    className?: string;
                    children?: React.ReactNode;
                  }) {
                    const match = /language-(\w+)/.exec(className ?? "");
                    const getCodeContent = (node: unknown): string => {
                      if (typeof node === "string") return node;
                      if (Array.isArray(node))
                        return node.map(getCodeContent).join("");
                      if (
                        typeof node === "object" &&
                        node !== null &&
                        "props" in node &&
                        (node as { props?: unknown }).props &&
                        (node as { props: { children?: unknown } }).props
                          .children
                      ) {
                        return getCodeContent(
                          (node as { props: { children: unknown } }).props
                            .children,
                        );
                      }
                      return "";
                    };
                    const codeContent = getCodeContent(children);
                    return !inline && match ? (
                      <div className="my-6">
                        <CodeBlock
                          language={match[1] ?? "plaintext"}
                          className={className}
                          {...props}
                        >
                          {codeContent}
                        </CodeBlock>
                      </div>
                    ) : (
                      <code
                        className={clsx(
                          "rounded bg-[#1e1e1e] px-1.5 py-0.5 font-mono text-sm text-gray-300",
                          className,
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children, ...props }) {
                    return (
                      <div className="my-6">
                        <pre
                          className="rounded-lg bg-[#1e1e1e] p-4 text-sm text-gray-300"
                          {...props}
                        >
                          {children}
                        </pre>
                      </div>
                    );
                  },
                  p({ children, ...props }) {
                    return (
                      <p
                        className={clsx(
                          "text-primary/90 mb-4 leading-7 last:mb-0",
                          message.role === "user"
                            ? "break-words whitespace-pre-wrap"
                            : "break-words whitespace-pre-wrap",
                        )}
                        {...props}
                      >
                        {children}
                      </p>
                    );
                  },
                  ul({ children, ...props }) {
                    return (
                      <ul
                        className="marker:text-primary/50 mb-4 list-disc pl-6 last:mb-0"
                        {...props}
                      >
                        {children}
                      </ul>
                    );
                  },
                  ol({ children, ...props }) {
                    return (
                      <ol
                        className="marker:text-primary/50 mb-4 list-decimal pl-6 last:mb-0"
                        {...props}
                      >
                        {children}
                      </ol>
                    );
                  },
                  li({ children, ...props }) {
                    return (
                      <li
                        className="text-primary/90 mb-1 leading-7 last:mb-0"
                        {...props}
                      >
                        {children}
                      </li>
                    );
                  },
                  blockquote({ children, ...props }) {
                    return (
                      <blockquote
                        className="border-primary/20 text-primary/80 mb-4 border-l-4 pl-4 italic last:mb-0"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  a({ children, ...props }) {
                    return (
                      <a
                        className="text-brand-primary hover:text-brand-primary/80 underline decoration-1 underline-offset-2 transition-colors duration-200"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  h1({ children, ...props }) {
                    return (
                      <h1
                        className="text-primary mb-4 text-2xl leading-7 font-bold last:mb-0"
                        {...props}
                      >
                        {children}
                      </h1>
                    );
                  },
                  h2({ children, ...props }) {
                    return (
                      <h2
                        className="text-primary mb-4 text-xl leading-7 font-bold last:mb-0"
                        {...props}
                      >
                        {children}
                      </h2>
                    );
                  },
                  h3({ children, ...props }) {
                    return (
                      <h3
                        className="text-primary mb-4 text-lg leading-7 font-bold last:mb-0"
                        {...props}
                      >
                        {children}
                      </h3>
                    );
                  },
                  table({ children, ...props }) {
                    return (
                      <div className="my-4 overflow-x-auto">
                        <table className="w-full border-collapse" {...props}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children, ...props }) {
                    return (
                      <th
                        className="border-primary/20 text-primary border-b px-4 py-2 text-left font-bold"
                        {...props}
                      >
                        {children}
                      </th>
                    );
                  },
                  td({ children, ...props }) {
                    return (
                      <td
                        className="border-primary/10 text-primary/90 border-b px-4 py-2"
                        {...props}
                      >
                        {children}
                      </td>
                    );
                  },
                  hr({ ...props }) {
                    return <hr className="border-primary/10 my-6" {...props} />;
                  },
                  strong({ children, ...props }) {
                    return (
                      <strong className="text-primary font-semibold" {...props}>
                        {children}
                      </strong>
                    );
                  },
                  em({ children, ...props }) {
                    return (
                      <em className="text-primary/90 italic" {...props}>
                        {children}
                      </em>
                    );
                  },
                  del({ children, ...props }) {
                    return (
                      <del className="text-primary/70" {...props}>
                        {children}
                      </del>
                    );
                  },
                }}
              >
                {displayedContent}
              </ReactMarkdown>
              {isTyping && (
                <span className="bg-brand-primary/50 inline-block h-4 w-2 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { MessageDisplay };
