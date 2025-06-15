import clsx from "clsx";
import "katex/dist/katex.min.css";
import type { ReactNode } from "react";
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
  messageId?: string;
  onUpdateMessage?: (newContent: string) => void;
}

// Convert tab-delimited rows (common from some models) into pipe-delimited
// markdown tables so they render properly. Runs only if we detect a tab.
const normalizeToMarkdownTable = (src: string): string => {
  // Quick test: any tab OR ≥2 consecutive spaces OR pipe suggests a table.
  const hint = /\t|\s{2,}|\|/;
  if (!hint.exec(src)) return src;

  const SEP = /\t+|\s{2,}|\s*\|\s*/; // tabs, big spaces, or pipes

  const lines = src.split(/\r?\n/);
  const result: string[] = [];

  let collecting = false;
  let headerEmitted = false;

  for (const raw of lines) {
    const trimmed = raw.trimEnd();
    const parts = SEP.exec(trimmed) ? trimmed.split(SEP).filter(Boolean) : [];

    if (parts.length >= 2) {
      // Table-like row
      if (!collecting) {
        collecting = true;
        headerEmitted = false;
      }

      if (!headerEmitted) {
        // First row -> header + separator
        result.push(`| ${parts.join(" | ")} |`);
        result.push(`| ${parts.map(() => "---").join(" | ")} |`);
        headerEmitted = true;
      } else {
        result.push(`| ${parts.join(" | ")} |`);
      }
    } else {
      // Non-table line, reset state
      collecting = false;
      headerEmitted = false;
      result.push(raw);
    }
  }

  return result.join("\n");
};

export default function MarkdownContent({
  content,
  role,
  messageId,
  onUpdateMessage,
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
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse overflow-hidden rounded-md border border-zinc-700 text-left dark:border-zinc-600">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-surface-2 text-primary dark:bg-zinc-800">
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
            className="border-b border-zinc-700 px-3 py-2 text-sm dark:border-zinc-700"
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
              const original = stringifyChildren(children).replace(/\n$/, "");
              const handleSave = (newChart: string) => {
                if (!onUpdateMessage || !messageId) return;
                const newBlock = `\`\`\`mermaid\n${newChart}\n\`\`\``;
                const updatedContent = content.replace(
                  /```mermaid[\s\S]*?```/,
                  newBlock,
                );
                onUpdateMessage(updatedContent);
              };
              return (
                <div className="my-4">
                  <MermaidDiagram
                    chart={original}
                    onSave={handleSave}
                    messageId={messageId}
                  />
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
      {normalizeToMarkdownTable(content)}
    </ReactMarkdown>
  );
}
