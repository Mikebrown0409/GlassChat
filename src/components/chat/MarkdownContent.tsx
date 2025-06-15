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
            <table className="min-w-full text-left">{children}</table>
          </div>
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
      {content}
    </ReactMarkdown>
  );
}
