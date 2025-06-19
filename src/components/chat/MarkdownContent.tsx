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
    <div
      className="relative my-4 max-h-96 overflow-x-auto overflow-y-auto rounded-lg border border-zinc-700 dark:border-zinc-600"
      onCopy={handleCopy}
      style={{ maxWidth: "100%" }}
    >
      <table
        ref={tableRef}
        className="min-w-full table-auto border-collapse text-left whitespace-nowrap"
      >
        {children}
      </table>
    </div>
  );
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
            className="odd:bg-surface-1 even:bg-surface-0 hover:bg-surface-2/60 dark:odd:bg-zinc-800/60 dark:even:bg-zinc-800/40 dark:hover:bg-zinc-700/60"
            {...props}
          >
            {children}
          </tr>
        ),
        thead: ({ children }) => (
          <thead className="bg-surface-2/95 text-primary sticky top-0 z-10 backdrop-blur dark:bg-zinc-800/90">
            {children}
          </thead>
        ),
        th: ({ children, ...props }) => (
          <th
            className="border-b border-zinc-700 px-3 py-2 text-sm font-semibold dark:border-zinc-600"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td
            className="border-b border-zinc-700 px-3 py-2 align-top text-sm break-words whitespace-pre-wrap dark:border-zinc-700"
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
              const codeString = stringifyChildren(children).replace(/\n$/, "");
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
