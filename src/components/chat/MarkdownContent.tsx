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
  const hint = /\t|\s{2,}|\||^\s*[-*]\s+[^:]+:/m;
  if (!hint.exec(src)) return src;

  const SEP = /\t+|\s{2,}|\s*\|\s*/; // tabs, big spaces, or pipes

  const lines = src.split(/\r?\n/);
  const result: string[] = [];

  let collecting = false;
  let headerEmitted = false;
  let columnCount = 0;

  // Helper to flush collected bullet rows into table rows
  const flushBulletTable = () => {
    if (bulletRows.length === 0) return;
    const headers = Object.keys(bulletRows[0]!);
    if (headers.length < 2) {
      bulletRows.length = 0;
      return;
    }

    // Emit header row
    result.push(`| ${headers.join(" | ")} |`);
    result.push(`| ${headers.map(() => "---").join(" | ")} |`);
    for (const row of bulletRows) {
      const cells = headers.map((h) => row[h] ?? "");
      result.push(`| ${cells.join(" | ")} |`);
    }
    bulletRows.length = 0;
  };

  // Bullet row collection
  type RowObj = Record<string, string>;
  const bulletRows: RowObj[] = [];
  let currentRow: RowObj | null = null;

  for (const raw of lines) {
    const bulletMatch = /^\s*[-*]\s+([^:]+):\s*(.+)$/.exec(raw);
    if (bulletMatch) {
      const [, keyRawMaybe, valueMaybe] = bulletMatch;
      const key = (keyRawMaybe ?? "").trim();
      const value = (valueMaybe ?? "").trim();
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (!currentRow) currentRow = {};
      // If key already exists, assume new row starts
      if (currentRow[key] !== undefined) {
        bulletRows.push(currentRow);
        currentRow = { [key]: value };
      } else {
        currentRow[key] = value;
      }
      continue; // Skip normal processing for bullet line
    } else if (currentRow) {
      // End of current bullet group
      bulletRows.push(currentRow);
      currentRow = null;
      // fallthrough to normal processing of this line
    }

    // Before processing non-bullet line, flush if we have collected rows
    flushBulletTable();

    const trimmed = raw.trimEnd();
    const partsArr = SEP.exec(trimmed)
      ? trimmed
          .split(SEP)
          .map((c) => c.trim())
          .filter<string>((c): c is string => c.length > 0)
      : [];

    if (partsArr.length >= 2) {
      // Detect pure alignment row like :--- or ---:
      const isAlignmentRow = partsArr.every((cell) => /^:?-{2,}:?$/.test(cell));
      if (isAlignmentRow) {
        // Skip adding this row; we'll generate our own separator if needed
        continue;
      }

      // Table-like row
      if (!collecting) {
        collecting = true;
        headerEmitted = false;
      }

      if (!headerEmitted) {
        // First row -> header + separator
        columnCount = partsArr.length;
        result.push(`| ${partsArr.join(" | ")} |`);
        result.push(`| ${partsArr.map(() => "---").join(" | ")} |`);
        headerEmitted = true;
      } else {
        // create mutable copy of parts
        let cells: string[] = partsArr.slice();
        if (cells.length > columnCount) {
          // merge extras into last cell
          cells = [
            ...cells.slice(0, columnCount - 1),
            cells.slice(columnCount - 1).join(" "),
          ];
        }
        if (cells.length < columnCount) {
          cells = [
            ...cells,
            ...Array<string>(columnCount - cells.length).fill(""),
          ];
        }
        result.push(`| ${cells.join(" | ")} |`);
      }
    } else {
      // Non-table line, reset state
      collecting = false;
      headerEmitted = false;
      result.push(raw);
    }
  }

  // Flush trailing bullet rows if any
  if (currentRow) bulletRows.push(currentRow);
  flushBulletTable();

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
          <div className="relative my-4 max-h-96 overflow-auto rounded-lg border border-zinc-700 dark:border-zinc-600">
            <table className="min-w-full table-auto border-collapse text-left">
              {children}
            </table>
          </div>
        ),
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
