import clsx from "clsx";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";
import { cn } from "~/utils/cn";
import { CodeBlock } from "./CodeBlock";
import { MermaidDiagram } from "./MermaidDiagram";

const remarkBreaksTyped = remarkBreaks as unknown as Pluggable;
const remarkMathTyped = remarkMath as unknown as Pluggable;
const rehypeKatexTyped = rehypeKatex as unknown as Pluggable;

interface Props {
  content: string;
  role: "user" | "assistant" | "system";
  _messageId?: string;
  _onUpdateMessage?: (newContent: string) => void;
}

// Previously attempted to auto-convert tabular-looking text into markdown tables.
// This heuristic proved too aggressive (e.g. turning simple bullet lists into tables).
// We now disable it and leave author content untouched.
// const normalizeToMarkdownTable = (src: string): string => src;

// Wrapper to render tables with copy-to-markdown capability
function MarkdownTableWrapper({ children }: { children?: React.ReactNode }) {
  const tableRef = React.useRef<HTMLTableElement>(null);

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const tableEl = tableRef.current;
    if (!tableEl || !sel.anchorNode || !tableEl.contains(sel.anchorNode))
      return;

    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (rows.length === 0) return;

    const mdRows: string[] = [];
    rows.forEach((r, idx) => {
      const cells = Array.from(r.children) as HTMLElement[];
      const parts = cells.map((c) => c.innerText.trim().replace(/\n+/g, " "));
      mdRows.push(`| ${parts.join(" | ")} |`);
      if (idx === 0) mdRows.push(`| ${parts.map(() => "---").join(" | ")} |`);
    });

    e.preventDefault();
    e.clipboardData.setData("text/plain", mdRows.join("\n"));
  };

  return (
    <div className="relative my-6 overflow-hidden rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-700">
      {/* Professional table container with enhanced styling */}
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: "28rem", maxWidth: "100%" }}
        onCopy={handleCopy}
      >
        <table
          ref={tableRef}
          className="min-w-full divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900"
          style={{ tableLayout: "auto" }}
        >
          {children}
        </table>
      </div>

      {/* Copy indicator */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity hover:opacity-100">
        <div className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Select & copy for markdown
        </div>
      </div>
    </div>
  );
}

// Filter out problematic external image URLs that cause certificate errors
function filterImageUrl(url: string): string {
  // List of problematic domains that cause certificate issues
  const problematicDomains = [
    "via.placeholder.com",
    "placeholder.com",
    "dummyimage.com",
  ];

  try {
    const urlObj = new URL(url);
    if (problematicDomains.some((domain) => urlObj.hostname.includes(domain))) {
      // Replace with a safe local placeholder or remove the image
      return ""; // Return empty string to hide the image
    }
  } catch {
    // Invalid URL, return empty string
    return "";
  }

  return url;
}

export default function MarkdownContent({
  content,
  role,
  _messageId,
  _onUpdateMessage,
}: Props) {
  const stringifyChildren = (node: ReactNode): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) {
      return node.filter((c): c is string => typeof c === "string").join("");
    }
    return "";
  };

  return (
    <div className={cn("prose prose-invert max-w-none", _messageId)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaksTyped, remarkMathTyped]}
        rehypePlugins={[rehypeKatexTyped]}
        components={{
          pre: ({ children }) => (
            <div className="overflow-x-auto">{children}</div>
          ),
          table: MarkdownTableWrapper,
          tr: ({ children, ...props }) => (
            <tr
              className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              {...props}
            >
              {children}
            </tr>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-50 dark:bg-zinc-800/60">{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300"
              style={{
                wordWrap: "break-word",
                wordBreak: "break-word",
                minWidth: "120px",
                maxWidth: "300px",
                whiteSpace: "normal",
                lineHeight: "1.5",
              }}
              {...props}
            >
              {children}
            </td>
          ),
          p: ({ children, ...props }) => {
            const plainText = stringifyChildren(children);
            const isShort = plainText.length < 50;
            return (
              <p
                className={clsx(
                  "mb-4 last:mb-0",
                  isShort
                    ? "whitespace-nowrap"
                    : role === "user"
                      ? "whitespace-normal"
                      : "whitespace-pre-wrap",
                )}
                {...props}
              >
                {children}
              </p>
            );
          },
          // @ts-expect-error inline present
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            if (!inline && match?.[1]) {
              if (match[1] === "mermaid") {
                const codeString = stringifyChildren(children).replace(
                  /\n$/,
                  "",
                );
                return (
                  <div className="my-4">
                    <MermaidDiagram chart={codeString} />
                  </div>
                );
              }
              const codeString = stringifyChildren(children).replace(/\n$/, "");
              return (
                <div className="my-4">
                  <CodeBlock language={match[1]} {...props}>
                    {codeString}
                  </CodeBlock>
                </div>
              );
            }
            if (match?.[1]) {
              const codeString = stringifyChildren(children);
              return (
                <CodeBlock language={match[1]} isInline {...props}>
                  {codeString}
                </CodeBlock>
              );
            }
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
            const filteredSrc = filterImageUrl(
              typeof src === "string" ? src : "",
            );

            // If the URL was filtered out, don't render the image
            if (!filteredSrc) {
              return alt ? (
                <span className="text-gray-500 italic">[Image: {alt}]</span>
              ) : null;
            }

            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filteredSrc}
                alt={alt}
                className="h-auto max-w-full rounded-lg"
                onError={(e) => {
                  // Hide broken images gracefully
                  e.currentTarget.style.display = "none";
                  console.warn("Failed to load image:", filteredSrc);
                }}
                {...props}
              />
            );
          },
          // Enhanced blockquotes for callouts and notes
          blockquote: ({ children }) => (
            <div className="my-4 border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/20">
              <div className="text-blue-700 dark:text-blue-300">{children}</div>
            </div>
          ),
          // Enhanced list styling for professional documents
          ul: ({ children, ...props }) => (
            <ul className="my-4 space-y-2 pl-6" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-4 space-y-2 pl-6" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-sm leading-relaxed" {...props}>
              {children}
            </li>
          ),
          // Enhanced heading styles for better hierarchy
          h1: ({ children, ...props }) => (
            <h1
              className="mt-6 mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="mt-5 mb-3 text-xl font-semibold text-zinc-800 dark:text-zinc-200"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="mt-4 mb-2 text-lg font-medium text-zinc-700 dark:text-zinc-300"
              {...props}
            >
              {children}
            </h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
