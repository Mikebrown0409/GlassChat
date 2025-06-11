"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  children: string;
  className?: string;
  isInline?: boolean;
}

export function CodeBlock({
  language,
  children,
  className,
  isInline = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  if (isInline) {
    return (
      <div className={clsx("group relative inline-block", className)}>
        <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="rounded bg-gray-800/50 px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "0.5rem",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            lineHeight: "1.5",
            display: "inline-block",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <div className={clsx("group relative", className)}>
      <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="rounded bg-gray-800/50 px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        showLineNumbers
        wrapLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
